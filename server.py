import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
import openai

# --- SETUP ---
# This part initializes the Flask web server application.
app = Flask(__name__)
CORS(app) # This allows your browser extension to communicate with the server.

# --- API KEY CONFIGURATION ---
# This safely loads your secret OpenAI API key from the Render environment variables.
try:
    openai.api_key = os.environ["OPENAI_API_KEY"]
except KeyError:
    # This is a fallback message for local testing if the key isn't set.
    # On Render, the `try` block will always succeed.
    print("Warning: OPENAI_API_KEY environment variable not set.")
    pass

# --- MAIN API ROUTE ---
# This is the single endpoint that your extension communicates with.
@app.route('/api/process', methods=['POST'])
def process_text():
    # Get the data sent from the extension
    data = request.get_json()
    text_to_process = data.get('text')
    action = data.get('action')

    # Basic error checking
    if not text_to_process or not action:
        return jsonify({"error": "Missing text or action"}), 400
    
    # --- ACTION LOGIC ---

    # 1. Handle non-AI features first (like thesaurus)
    if action == "thesaurus":
        try:
            api_url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{text_to_process}"
            response = requests.get(api_url)
            if response.status_code == 404: return jsonify({"result": f"Sorry, no synonyms found for '{text_to_process}'."})
            response.raise_for_status()
            json_data = response.json()
            all_synonyms = set()
            for entry in json_data:
                for meaning in entry.get('meanings', []):
                    for synonym in meaning.get('synonyms', []): all_synonyms.add(synonym)
            if not all_synonyms: return jsonify({"result": f"Sorry, no synonyms found for '{text_to_process}'."})
            result_text = "Synonyms: " + ", ".join(list(all_synonyms)[:15])
            return jsonify({"result": result_text})
        except Exception as e:
            print(f"Thesaurus Error: {e}")
            return jsonify({"result": f"Could not find synonyms for '{text_to_process}'."})
    
    # 2. Handle all AI-powered features
    # This is a dictionary that maps an 'action' to a specific 'prompt' for the AI.
    prompt_map = {
        # NEW RECIPE FEATURE
        "recipe": f"Analyze the following text. If it contains a recipe, extract it and format it clearly with headings for 'Ingredients' and 'Instructions'. Use markdown lists for both sections. If no recipe is found, respond with the single sentence: 'No recipe found in the selected text.' Text: \"{text_to_process}\"",
        
        "ask": text_to_process,
        "explain": f"Explain the following concept simply: \"{text_to_process}\"",
        "define": f"Provide a one-sentence dictionary-style definition for: \"{text_to_process}\"",
        "summarize": f"Summarize the key points of the following text into a few bullet points: \"{text_to_process}\"",
        "proofread": f"Proofread the following text. Correct any spelling and grammar errors, but do not change the meaning. Return only the corrected text: \"{text_to_process}\"",
        "professional": f"Rewrite the following text to sound more formal and professional, suitable for a business email or corporate document: \"{text_to_process}\""
    }
    
    # Check if the action is translation, as it has a different structure
    if action.startswith("translate-"):
        lang_code = action.split('-')[1]
        language_map = {
            "en": "English", "zh": "Chinese (Mandarin)", "hi": "Hindi", "es": "Spanish",
            "fr": "French", "ar": "Arabic (Standard)", "bn": "Bengali", "ru": "Russian",
            "pt": "Portuguese", "id": "Indonesian", "it": "Italian", "de": "German", 
            "jp": "Japanese"
        }
        language = language_map.get(lang_code, "the specified language")
        prompt = f"Translate the following text to {language}. Auto-detect the input language. Return only the translation: \"{text_to_process}\""
    else:
        # If not translation, get the correct prompt from our map. Default to "ask".
        prompt = prompt_map.get(action, text_to_process)

    # --- FINAL API CALL TO OPENAI ---
    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that provides structured and clear answers."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500 # Increased for potentially long recipes
        )
        ai_result = response.choices[0].message.content.strip()
        return jsonify({"result": ai_result})
    except Exception as e:
        print(f"OpenAI Error: {e}")
        return jsonify({"error": str(e)}), 500

# --- RUN FOR LOCAL TESTING ---
# This part is only used when you run `python3 server.py` on your own computer.
# It is ignored by the Gunicorn server on Render.
if __name__ == '__main__':
    app.run(port=5000, debug=True)