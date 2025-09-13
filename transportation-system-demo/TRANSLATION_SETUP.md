# Translation API Setup

## Overview
The chat button now uses the FastAPI translation service from `app.py` for real-time text translation.

## Setup Instructions

### 1. Start the FastAPI Server
Make sure your FastAPI server is running:
```bash
# In the root directory (where app.py is located)
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### 2. Configure API URL
The default API URL is set to `http://localhost:8000`. To change this:

1. Open `src/config/api.js`
2. Update the `BASE_URL` value:
```javascript
BASE_URL: 'http://your-api-url:port',
```

### 3. Supported Languages
The translation service supports:
- English (en)
- Filipino/Tagalog (tl)
- Cebuano/Bisaya (ceb)
- Ilocano (ilo)
- Pangasinan (pag)
- Chinese (zh)
- Japanese (ja)
- Korean (ko)

### 4. How It Works
1. User types a message in English
2. Clicks the translate button
3. Message is sent to the FastAPI server
4. Server translates using OPUS-MT or MBART models
5. Translated text is displayed to the user

### 5. Error Handling
- If the API is unavailable, an error message is shown
- Network errors are caught and displayed to the user
- Translation errors from the API are properly handled

## Testing
1. Start both the FastAPI server and React app
2. Open the chat button (bottom right corner)
3. Type a message in English
4. Click translate
5. The message should be translated to your selected language

## Troubleshooting
- Make sure the FastAPI server is running on the correct port
- Check the browser console for any API errors
- Verify the API URL in the configuration
