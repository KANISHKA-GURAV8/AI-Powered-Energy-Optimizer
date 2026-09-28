import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

try:
    model = genai.GenerativeModel('gemini-flash-latest')
    
    formatted_history = [
        {"role": "user", "parts": ["Hi"]},
        {"role": "model", "parts": ["Hello"]}
    ]
    chat = model.start_chat(history=formatted_history)
    
    response = chat.send_message("Testing!")
    print(response.text)
except Exception as e:
    import traceback
    traceback.print_exc()
