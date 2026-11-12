# Diário de Leitura

## 1. Instalar

Instale o Node.js 22 (22.13 ou superior), extraia o projeto e abra a pasta **DiarioDeLeitura** no VS Code.

No terminal PowerShell, dentro da pasta do projeto, execute:

```cmd
npm ci
```

## 2. Configurar o Firebase

Se o arquivo `.env` ainda não existir, execute:

```powershell
Copy-Item .env.example .env
```

No [console do Firebase](https://console.firebase.google.com/):

1. Abra o projeto e adicione um aplicativo **Web** nas configurações.
2. Preencha o `.env` com os valores de `apiKey`, `projectId` e `appId`:

   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=sua_apiKey
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu_projectId
   EXPO_PUBLIC_FIREBASE_APP_ID=seu_appId
   ```

3. Em **Authentication → Sign-in method**, habilite **E-mail/senha**.
4. Crie o **Firestore Database** padrão. Na aba **Rules**, cole o conteúdo de `firestore.rules` e publique.

Se estiver usando o Firebase do grupo já configurado, basta preencher o `.env` com os dados desse projeto.

## 3. Iniciar no navegador

```cmd
npm run --clear --port 8082
```

Abra **http://localhost:8082** no Edge ou Chrome, em janela normal. No primeiro acesso, clique em **Criar uma conta**.

## Iniciar no Android (opcional)

Instale o **Expo Go compatível com SDK 54** e execute:

```cmd
npx expo start --clear
```

Conecte o celular à mesma rede Wi-Fi do computador e leia o QR code pelo Expo Go.

Para encerrar, pressione **Ctrl+C**. Nas próximas vezes, execute apenas o comando para iniciar. Se alterar o `.env`, reinicie o servidor.
