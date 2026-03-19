from setuptools import setup, find_packages

setup(
    name='aport-django',
    version='1.0.0',
    description='APort verification middleware for Django',
    author='APort Team',
    author_email='hello@aport.io',
    url='https://github.com/aporthq/aport-integrations',
    packages=find_packages(),
    install_requires=[
        'requests>=2.28.0',
    ],
    extras_require={
        'django': ['django>=3.2'],
    },
    python_requires='>=3.8',
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
    ],
    keywords='aport django middleware security verification',
)
