# RenderLivre com Google Login e OpenAI

## 1. Firebase

1. Cria um projeto em https://console.firebase.google.com
2. Ativa Authentication > Sign-in method > Google.
3. Em Project settings > General, cria uma Web app.
4. Copia a configuração pública para `firebase-config.js`.
5. Em Project settings > Service accounts, cria uma private key.

## 2. Netlify

Em Site settings > Environment variables, adiciona:

- `OPENAI_API_KEY`
- `OPENAI_IMAGE_MODEL`, por exemplo `gpt-image-2`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `DAILY_RENDER_LIMIT`, por exemplo `5`

## 3. Publicar

Faz deploy da pasta inteira `renderlivre`, não apenas dos ficheiros HTML/CSS/JS, porque agora existe uma Netlify Function em `netlify/functions/render.js`.

## 4. Nota

A chave OpenAI nunca deve entrar em `app.js` nem em `firebase-config.js`. Ela fica apenas nas variáveis do Netlify.
