from waitress import serve
import serve_hackathon_gpt2
serve(serve_hackathon_gpt2.app, host='0.0.0.0', port=8080)