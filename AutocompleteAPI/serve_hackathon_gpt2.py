from flask import Flask,jsonify
from flask import request
from flask_cors import CORS, cross_origin
from flask_selfdoc import Autodoc

import requests
import tensorflow
from transformers import pipeline, set_seed

import base64
import io
from io import BytesIO
from PIL import Image

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
auto = Autodoc(app)
app.config['CORS_HEADERS'] = 'Content-Type'

text_generator_model = None
text_analysis_model = None

def load_text_generation_model():    
  global text_generator_model
  
  set_seed(42)
  text_generator_model = pipeline('text-generation', model='gpt2')

def load_text_analysis_model():    
  global text_analysis_model
  
  text_analysis_model = pipeline('sentiment-analysis')
    
def get_generated_text(text, length, sequences):
  global text_generator_model
  print(len(text.split()))
  return text_generator_model(text, 
  max_length=len(text.split()) + length + 1, 
  temperature=1.0,  
  top_p=0.9,
  num_return_sequences=sequences)

def get_analyzed_text(text):
  global text_analysis_model
  
  return text_analysis_model(text)

def init_app():
    print("INIT CALLED")

    print("############### LOADING GENERATOR MODELS #############################")
    load_text_generation_model()
    load_text_analysis_model()
    print("############### LOADED GENERATOR MODELS #############################")
  
    print("INIT ENDED")

init_app()

@app.route('/')
@auto.doc()
def hello():
    """
    Root api, is used to test if api is working!
    ---
    tags:
      - Text Generator API
    parameters:
      - 
    responses:
      500:
        description: Error on server side
      200:
        Generator System!

    """
    return 'Generator System!'

@app.route('/api/documentation')
@cross_origin()
def documentation():
  return auto.html()

@app.route('/api/generate-text', methods=['POST'])
@auto.doc()
@cross_origin()
def generateText():
  """
    Text Recommender API
    Call this api to send text and get an array of recommended text
    Parameters must be passed as multipart-form
    ---
    TAGS:
      - Text Recommender API
    PARAMETERS:
      - text: string
        in: string
        type: string
        required: true
        description: Text that is going to be used as base for the generated text
      - length: string
        in: string
        type: int
        required: true
        description: The number of words to be generated
      - sequences: string
        in: string
        type: int
        required: true
        description: The number of sequencesto generate
    RESPONSES:
      500:
        description: Error with the parameters, text or length!
      200:
        description: the original text and generated text are going to be responded
        schema:
          properties:
            originalText:
              type: string
              description: original text recieved
              default: 
            generatedTexts:
              type: array
              description: array of strings that content the generated text
              default: []
              items:
                type: string
    """
  print("enter in generation")
  if request.method == 'POST':
      content = request.json
      text = content['text'].strip()
      length = int(content['length'])
      sequences = int(content['sequences'])
      print(text)
      
      generated_texts = get_generated_text(text, length, sequences)
      return jsonify({'originalText': text, 'generatedTexts': generated_texts})

@app.route('/api/sentiment-text', methods=['POST'])
@auto.doc()
@cross_origin()
def sentimentText():
  """
    Text Sentiment API
    Call this api to send text and get a sentiment analysis
    ---
    TAGS:
      - Text Sentiment API
    PARAMETERS:
      - text: string
        in: string
        type: string
        required: true
        description: Text that is going to be used as base for the sentiment analysis
    RESPONSES:
      500:
        description: Error with the parameters, text!
      200:
        description: the original text and its sentiment analysis
        schema:
          properties:
            originalText:
              type: string
              description: original text recieved
              default: 
            analysis:
              type: string
              description: sentiment analysis
              default:
    """
  if request.method == 'POST':
      content = request.json
      text = content['text'].strip()
      print(text)
      
      analyzed_text = get_analyzed_text(text)
      return jsonify({'originalText': text, 'analysis': analyzed_text})

@app.route('/api/optimize', methods=['POST'])
@auto.doc()
@cross_origin()
def optimize():
    """
    Optimize Image API
    Call this api to send a image and get an optimized image
    Parameters must be passed as multipart-form
    ---
    TAGS:
      - Optimize Image API
    PARAMETERS:
      - file: file
        in: file
        type: file
        required: true
        description: Image that is going to be used for the optimization
    RESPONSES:
      500:
        description: Error with the image!
      200:
        description: An optimized image
        schema:
          properties:
            optimizedImage:
              type: string
              description: optimized image
              default:
    """
    if request.method == 'POST':
        # We will get the file from the request
        file = request.files['file']       
        # Load image 
        img = Image.open(file)

        size = 512, 512
        img.thumbnail(size, Image.ANTIALIAS)
        buffered = BytesIO()
        img.save(buffered, format="JPEG")
        img_str = base64.b64encode(buffered.getvalue())

        return jsonify({'optimizedImage': img_str.decode("utf-8")})

if __name__ == '__main__':
  init_app()
  app.run(port=8080)