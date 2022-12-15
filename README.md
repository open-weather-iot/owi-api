# owi-api
Esse repositório contém o código da API para ingestão e tratamento de dados das estações meteorológicas.

A API foi desenvolvida em NodeJS com TypeScript e utiliza o banco de dados MongoDB. Está hospedada no serviço [Render](https://render.com/) no endereço [https://owi-server.onrender.com](https://owi-server.onrender.com). Atualizações no repositório da API são automaticamente refletidas no Render dentro de alguns minutos.

## 🚀 Configuração inicial
Essas instruções vão permitir que você tenha uma cópia funcional do projeto na sua máquina local para desenvolvimento e testes.

### 📋 Requisitos
- [NodeJS v18.3.0 LTS / NPM v8.11](https://nodejs.org/pt-br/download/) (recomenda-se fortemente a utilização do [NVM](https://github.com/nvm-sh/nvm) para gerenciar facilmente as versões do NodeJS)
- [Yarn](https://yarnpkg.com/getting-started/install)

### 🔧 Instalação
- Clone o repositório
```sh
git clone https://github.com/open-weather-iot/owi-api.git
```

- Instale as dependências do projeto:
```sh
yarn install
```

- Inicie a API:
```sh
# modo desenvolvedor
yarn start

# ou em modo debug (use o Chrome Dev Tools)
yarn start:debug
```
  A API deve iniciar com sucesso.

## 📊 Banco de Dados
Utilizamos o banco de dados MongoDB Atlas em produção. Em desenvolvimento, a biblioteca [`mongodb-memory-server`](https://github.com/nodkz/mongodb-memory-server) automaticamente cria uma instância temporária do MongoDB.

## 📦 Desenvolvimento
### ⌨️ Estilo de Código
Por padrão, utilizamos o [ESLint](https://eslint.org/) com regras pré-configuradas para definir o estilo de código a ser seguido.

## 👏 Contribuições
Todos são bem-vindos a realizar contribuições e sugestões no código! Recomenda-se enviar *pull requests* ou então criar *issues*.
