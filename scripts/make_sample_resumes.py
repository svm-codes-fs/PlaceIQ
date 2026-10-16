"""Generate the sample resume PDFs in samples/resumes/ (used for demos and tests).

    python scripts/make_sample_resumes.py
"""
import os

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

OUT = os.path.join(os.path.dirname(__file__), '..', 'samples', 'resumes')

RESUMES = {
    'backend_developer.pdf': {
        'name': 'Priya Malhotra', 'contact': 'priya.malhotra@example.com | +91 98765 43210',
        'Education': ['B.E. Computer Engineering, Thapar Institute of Engineering and Technology, 2027. CGPA: 8.9/10'],
        'Skills': ['Python, Java, Go, SQL', 'Flask, Spring Boot, REST APIs, Microservices',
                   'PostgreSQL, Redis, Docker, Kubernetes, AWS', 'Data Structures, System Design, Git'],
        'Experience': ['Software Engineering Intern, Razorpay (May to Jul 2026): built an idempotent webhook '
                       'delivery service in Go handling 2M events/day; cut retries by 40%.'],
        'Projects': ['Distributed Job Queue: a Redis-backed task queue in Python with retries and a Flask dashboard.',
                     'URL Shortener: Spring Boot and PostgreSQL service with caching, deployed on AWS with Docker.'],
    },
    'data_scientist.pdf': {
        'name': 'Rahul Iyer', 'contact': 'rahul.iyer@example.com',
        'Education': ['B.E. Computer Engineering, 2027. CGPA: 8.2/10'],
        'Skills': ['Python, SQL, R', 'Machine Learning, Deep Learning, NLP', 'PyTorch, scikit-learn, Pandas, NumPy',
                   'Data Visualization, Statistics, Spark'],
        'Experience': ['Data Science Intern, Swiggy (2026): demand-forecasting model with gradient boosting; '
                       'improved MAPE by 12%.'],
        'Projects': ['Resume Classifier: fine-tuned a transformer for job-category classification (NLP).',
                     'Fraud Detection: anomaly detection on 1M transactions with scikit-learn and Spark.'],
    },
    'embedded_engineer.pdf': {
        'name': 'Sneha Kulkarni', 'contact': 'sneha.k@example.com',
        'Education': ['B.E. Electronics and Communication, 2027. CGPA: 8.6/10'],
        'Skills': ['Embedded C, C++, Python', 'Microcontrollers (STM32, Arduino), FPGA, Verilog',
                   'Analog Circuits, Digital Electronics, PCB Design (KiCad)', 'MATLAB, Signal Processing, IoT'],
        'Experience': ['Hardware Intern, Bosch (2026): firmware for a CAN-bus sensor node on STM32.'],
        'Projects': ['Smart Energy Meter: IoT meter with an STM32, custom PCB and MQTT dashboard.',
                     'FPGA Audio Equalizer: real-time digital signal processing in Verilog.'],
    },
    'mechanical_engineer.pdf': {
        'name': 'Vivek Choudhary', 'contact': 'vivek.c@example.com',
        'Education': ['B.E. Mechanical Engineering, 2027. CGPA: 7.4/10'],
        'Skills': ['SolidWorks, AutoCAD, CATIA', 'ANSYS (FEA), CFD', 'Manufacturing, CNC, Thermodynamics',
                   'Project Management, Excel'],
        'Experience': ['Trainee, Maruti Suzuki (2026): reduced fixture changeover time on the welding line by 15%.'],
        'Projects': ['BAJA SAE Vehicle: chassis design in SolidWorks with ANSYS crash analysis.',
                     'Heat Exchanger Optimisation: CFD study improving effectiveness by 8%.'],
    },
}


def build(path, data):
    styles = getSampleStyleSheet()
    story = [Paragraph(data['name'], styles['Title']), Paragraph(data['contact'], styles['Normal']), Spacer(1, 12)]
    for section in ('Education', 'Skills', 'Experience', 'Projects'):
        story.append(Paragraph(section, styles['Heading2']))
        for line in data[section]:
            story.append(Paragraph('- ' + line, styles['Normal']))
        story.append(Spacer(1, 8))
    SimpleDocTemplate(path, pagesize=A4, title=f'{data["name"]} - Resume').build(story)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for filename, data in RESUMES.items():
        build(os.path.join(OUT, filename), data)
        print('wrote', filename)
