import sys
import os

try:
    import json
    import io
    import random
    import smtplib
    import string
    import math
    import re
    import time
    import uuid
    import pytesseract
    import cv2
    import numpy as np
    import requests
    import uvicorn
    import hashlib
    import xml.etree.ElementTree as ET
    import fitz  # PyMuPDF
    import googlemaps
    import anthropic
    import reportlab
    from loguru import logger
    from PIL import Image
    import fastapi
    import sqlalchemy
    import jose
    import passlib
    import pydantic
    import langdetect
    import slowapi
    import redis
    print("ALL_IMPORTS_SUCCESS")
except ImportError as e:
    print(f"IMPORT_ERROR: {e}")
except Exception as e:
    print(f"OTHER_ERROR: {e}")
