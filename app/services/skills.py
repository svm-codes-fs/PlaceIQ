"""
Skill vocabulary: canonical names and the spellings that map to them.

Used to normalise skills from resumes and job requirements (so "ReactJS",
"react.js" and "React" compare equal) and by the offline resume parser to
find skills in plain text.
"""
import re

SKILLS = {
    # Programming languages
    'Python': ['python', 'python3'],
    'Java': ['java'],
    'C': ['c language', 'c programming'],
    'C++': ['c++', 'cpp'],
    'C#': ['c#', 'csharp'],
    'JavaScript': ['javascript', 'js', 'es6'],
    'TypeScript': ['typescript', 'ts'],
    'Go': ['golang'],
    'Rust': ['rust'],
    'Kotlin': ['kotlin'],
    'Swift': ['swift'],
    'R': ['r programming', 'r language'],
    'MATLAB': ['matlab', 'simulink'],
    'SQL': ['sql', 'plsql', 'pl/sql', 't-sql'],
    'Bash': ['bash', 'shell scripting', 'shell'],
    # Web and backend
    'React': ['react', 'reactjs', 'react.js'],
    'Angular': ['angular', 'angularjs'],
    'Vue': ['vue', 'vuejs', 'vue.js'],
    'Next.js': ['next.js', 'nextjs'],
    'Node.js': ['node', 'nodejs', 'node.js'],
    'Express': ['express', 'expressjs', 'express.js'],
    'Django': ['django'],
    'Flask': ['flask'],
    'FastAPI': ['fastapi'],
    'Spring Boot': ['spring boot', 'springboot', 'spring'],
    'HTML': ['html', 'html5'],
    'CSS': ['css', 'css3'],
    'Tailwind CSS': ['tailwind', 'tailwindcss', 'tailwind css'],
    'REST APIs': ['rest', 'rest api', 'rest apis', 'restful'],
    'GraphQL': ['graphql'],
    'Microservices': ['microservices', 'microservice'],
    # Data and AI
    'Machine Learning': ['machine learning', 'ml'],
    'Deep Learning': ['deep learning', 'dl'],
    'NLP': ['nlp', 'natural language processing'],
    'Computer Vision': ['computer vision', 'opencv'],
    'TensorFlow': ['tensorflow', 'keras'],
    'PyTorch': ['pytorch', 'torch'],
    'scikit-learn': ['scikit-learn', 'sklearn', 'scikit learn'],
    'Pandas': ['pandas'],
    'NumPy': ['numpy'],
    'Data Analysis': ['data analysis', 'data analytics'],
    'Data Visualization': ['data visualization', 'matplotlib', 'seaborn', 'tableau', 'power bi'],
    'Statistics': ['statistics', 'statistical analysis'],
    'LLMs': ['llm', 'llms', 'large language models', 'generative ai', 'genai'],
    'Spark': ['spark', 'pyspark', 'apache spark'],
    # Databases and infrastructure
    'PostgreSQL': ['postgresql', 'postgres'],
    'MySQL': ['mysql'],
    'MongoDB': ['mongodb', 'mongo'],
    'Redis': ['redis'],
    'Docker': ['docker', 'containers'],
    'Kubernetes': ['kubernetes', 'k8s'],
    'AWS': ['aws', 'amazon web services', 'ec2', 's3'],
    'Azure': ['azure'],
    'GCP': ['gcp', 'google cloud'],
    'Linux': ['linux', 'unix'],
    'Git': ['git', 'github', 'gitlab'],
    'CI/CD': ['ci/cd', 'cicd', 'github actions', 'jenkins'],
    'System Design': ['system design', 'distributed systems'],
    'Data Structures': ['data structures', 'dsa', 'algorithms', 'data structures and algorithms'],
    'OOP': ['oop', 'object oriented programming', 'object-oriented programming'],
    'DBMS': ['dbms', 'database management'],
    'Operating Systems': ['operating systems', 'os concepts'],
    'Computer Networks': ['computer networks', 'networking', 'tcp/ip'],
    'Android': ['android', 'android development'],
    'Flutter': ['flutter', 'dart'],
    'Cybersecurity': ['cybersecurity', 'cyber security', 'network security'],
    # Electronics and electrical
    'Embedded C': ['embedded c', 'embedded systems', 'embedded'],
    'Microcontrollers': ['microcontrollers', 'microcontroller', 'arduino', 'stm32', '8051', 'avr'],
    'VLSI': ['vlsi', 'vlsi design'],
    'Verilog': ['verilog', 'systemverilog'],
    'VHDL': ['vhdl'],
    'FPGA': ['fpga'],
    'Digital Electronics': ['digital electronics', 'digital design', 'digital logic'],
    'Analog Circuits': ['analog circuits', 'analog design', 'analog electronics'],
    'Signal Processing': ['signal processing', 'dsp', 'digital signal processing'],
    'PCB Design': ['pcb design', 'pcb', 'altium', 'kicad', 'eagle'],
    'IoT': ['iot', 'internet of things'],
    'Raspberry Pi': ['raspberry pi'],
    'Communication Systems': ['communication systems', 'wireless communication', 'rf'],
    'Power Systems': ['power systems', 'power electronics'],
    'Control Systems': ['control systems', 'pid control'],
    'PLC': ['plc', 'scada'],
    # Mechanical, civil, chemical
    'AutoCAD': ['autocad', 'auto cad'],
    'SolidWorks': ['solidworks', 'solid works'],
    'CATIA': ['catia'],
    'ANSYS': ['ansys', 'fea', 'finite element analysis'],
    'CFD': ['cfd', 'computational fluid dynamics'],
    'Thermodynamics': ['thermodynamics', 'heat transfer'],
    'Manufacturing': ['manufacturing', 'cnc', 'production engineering'],
    'Robotics': ['robotics', 'ros'],
    'STAAD Pro': ['staad', 'staad pro', 'staad.pro'],
    'Revit': ['revit', 'bim'],
    'Structural Analysis': ['structural analysis', 'structural design'],
    'Surveying': ['surveying', 'total station'],
    'Project Management': ['project management', 'primavera', 'ms project'],
    'Aspen Plus': ['aspen', 'aspen plus', 'aspen hysys'],
    'Process Engineering': ['process engineering', 'process design', 'chemical process'],
    # Professional
    'Communication': ['communication skills', 'public speaking'],
    'Leadership': ['leadership', 'team leadership'],
    'Problem Solving': ['problem solving', 'problem-solving', 'competitive programming'],
    'Excel': ['excel', 'ms excel', 'spreadsheets'],
}

_ALIASES = {}
for canonical, aliases in SKILLS.items():
    _ALIASES[canonical.lower()] = canonical
    for alias in aliases:
        _ALIASES[alias] = canonical

# Single letters and short or common words are too ambiguous to look for in free text
_TEXT_SKIP = {'c', 'r', 'go', 'ml', 'dl', 'os', 'js', 'ts', 'rf', 'shell', 'spring', 'node', 'rest', 'swift',
              'rust', 'embedded', 'pcb', 'containers', 'aspen', 'excel', 'staad', 'communication', 'leadership'}

# Longest aliases first, so "machine learning" is matched before shorter overlapping names
_PATTERNS = [(re.compile(r'(?<![\w+#.])' + re.escape(alias) + r'(?![\w+#])', re.IGNORECASE), canonical)
             for alias, canonical in sorted(_ALIASES.items(), key=lambda kv: -len(kv[0]))
             if alias not in _TEXT_SKIP]


def normalize_skill(name):
    """Canonical spelling of a skill, or the trimmed input when it isn't in the vocabulary."""
    cleaned = re.sub(r'\s+', ' ', str(name or '')).strip().strip('.,;')
    return _ALIASES.get(cleaned.lower(), cleaned)


def normalize_skills(names):
    """Normalise and de-duplicate a list of skills, keeping their order."""
    seen, result = set(), []
    for name in names or []:
        skill = normalize_skill(name)
        if skill and skill.lower() not in seen and len(skill) <= 60:
            seen.add(skill.lower())
            result.append(skill)
    return result


def find_skills(text):
    """Skills from the vocabulary mentioned anywhere in free text."""
    found = []
    for pattern, canonical in _PATTERNS:
        if canonical not in found and pattern.search(text):
            found.append(canonical)
    return found


def parse_skill_list(value):
    """Accept a list or a comma/semicolon separated string."""
    if isinstance(value, str):
        value = re.split(r'[,;\n]', value)
    return normalize_skills(v for v in (value or []) if str(v).strip())
