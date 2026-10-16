"""
Placement policy engine.

Colleges switch rules on and set their parameters from the admin UI; the rules
are stored as rows in placement_policies. `PolicyEvaluator` checks a student
against the drive's own criteria *and* every enabled rule, returning every
reason they can't apply, so the UI can answer "Why can't I apply?".
"""
from decimal import Decimal

from app.extensions import db
from app.models import PlacementPolicy
from app.models.policy import RULE_TYPES
from app.services.accounts import ValidationError
from app.services.eligibility import eligibility_failures

OFFER_STATUSES = ('Offered', 'Accepted')

# Human-readable definition of each rule, its parameters and their defaults
RULES = {
    'max_offers': {
        'label': 'Maximum offers per student',
        'description': 'A student holding this many offers (pending or accepted) cannot apply or receive more.',
        'params': {'limit': {'label': 'Offer limit', 'type': 'int', 'min': 1, 'default': 2}},
    },
    'dream_lock': {
        'label': 'Dream-tier lock',
        'description': 'Once placed, a student may only apply to dream-tier drives (package at or above the '
                       'threshold). Students already placed in a dream-tier job cannot apply again.',
        'params': {'dream_min_lpa': {'label': 'Dream tier from (LPA)', 'type': 'decimal', 'min': 0, 'default': 20}},
    },
    'min_cgpa': {
        'label': 'College-wide CGPA floor',
        'description': 'Applies to every drive, on top of the company\'s own cutoff.',
        'params': {'value': {'label': 'Minimum CGPA', 'type': 'decimal', 'min': 0, 'max': 10, 'default': 6}},
    },
    'max_backlogs': {
        'label': 'College-wide backlog limit',
        'description': 'Applies to every drive, on top of the company\'s own limit.',
        'params': {'value': {'label': 'Maximum backlogs', 'type': 'int', 'min': 0, 'default': 1}},
    },
    'block_after_placement': {
        'label': 'One job per student',
        'description': 'Placed students cannot apply to any further drives.',
        'params': {},
    },
}
assert set(RULES) == set(RULE_TYPES)


def default_params(rule_type):
    return {key: spec['default'] for key, spec in RULES[rule_type]['params'].items()}


def _clean_params(rule_type, params):
    errors, clean = [], {}
    for key, spec in RULES[rule_type]['params'].items():
        raw = params.get(key, spec['default'])
        try:
            value = int(raw) if spec['type'] == 'int' else float(Decimal(str(raw)))
        except (TypeError, ValueError, ArithmeticError):
            errors.append(f'{spec["label"]} must be a number.')
            continue
        if value < spec.get('min', value) or value > spec.get('max', value):
            bounds = f'between {spec["min"]} and {spec["max"]}' if 'max' in spec else f'{spec["min"]} or more'
            errors.append(f'{spec["label"]} must be {bounds}.')
            continue
        clean[key] = value
    if errors:
        raise ValidationError(errors)
    return clean


def list_policies():
    """Every rule type with this college's current setting (disabled defaults if never configured)."""
    stored = {p.rule_type: p for p in PlacementPolicy.query.all()}
    result = []
    for rule_type, spec in RULES.items():
        policy = stored.get(rule_type)
        result.append({
            'rule_type': rule_type,
            'label': spec['label'],
            'description': spec['description'],
            'param_specs': spec['params'],
            'enabled': bool(policy and policy.enabled),
            'params': {**default_params(rule_type), **(policy.params if policy else {})},
        })
    return result


def save_policy(rule_type, data):
    if rule_type not in RULES:
        raise ValidationError([f'Unknown rule "{rule_type}".'])
    params = _clean_params(rule_type, data.get('params') or {})
    policy = PlacementPolicy.query.filter_by(rule_type=rule_type).first()
    if not policy:
        policy = PlacementPolicy(rule_type=rule_type)
        db.session.add(policy)
    policy.enabled = bool(data.get('enabled'))
    policy.params = params
    db.session.commit()
    return policy


class PolicyEvaluator:
    """
    Evaluates one student against drives. Loads the college's enabled rules and
    the student's offers once, so checking many drives costs no extra queries.
    """

    def __init__(self, student):
        self.student = student
        self.rules = {p.rule_type: {**default_params(p.rule_type), **(p.params or {})}
                      for p in PlacementPolicy.query.filter_by(enabled=True).all()}
        self.offers = [a for a in student.applications if a.status in OFFER_STATUSES]
        self.accepted = [a for a in self.offers if a.status == 'Accepted']

    def policy_failures(self, company):
        s, rules, failures = self.student, self.rules, []

        if 'min_cgpa' in rules and s.cgpa < Decimal(str(rules['min_cgpa']['value'])):
            failures.append(f'College policy: CGPA must be at least {rules["min_cgpa"]["value"]:g}.')
        if 'max_backlogs' in rules and s.backlogs > rules['max_backlogs']['value']:
            failures.append(f'College policy: at most {rules["max_backlogs"]["value"]} backlog(s) allowed.')
        if 'max_offers' in rules and len(self.offers) >= rules['max_offers']['limit']:
            failures.append(f'College policy: you already hold {len(self.offers)} offer(s); '
                            f'the limit is {rules["max_offers"]["limit"]}.')

        if s.placement_status == 'Placed':
            if 'block_after_placement' in rules:
                failures.append('College policy: placed students cannot apply to further drives.')
            elif 'dream_lock' in rules:
                threshold = Decimal(str(rules['dream_lock']['dream_min_lpa']))
                best = max((a.company.package_lpa for a in self.accepted), default=Decimal(0))
                if best >= threshold:
                    failures.append('College policy: you are already placed in a dream-tier job.')
                elif company.package_lpa < threshold:
                    failures.append(f'College policy: placed students may only apply to dream-tier drives '
                                    f'(₹{threshold:g} LPA or more).')
        return failures

    def failures(self, company):
        """Every reason the student can't apply: the drive's criteria first, then college policies."""
        return eligibility_failures(self.student, company) + self.policy_failures(company)

    def offer_blocked(self):
        """Reason a new offer can't be made to this student, if any."""
        if 'max_offers' in self.rules and len(self.offers) >= self.rules['max_offers']['limit']:
            return (f'{self.student.name} already holds {len(self.offers)} offer(s); '
                    f'the college limit is {self.rules["max_offers"]["limit"]}.')
        return None
