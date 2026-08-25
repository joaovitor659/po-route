# Wine PO Approval Flow

Crie um aplicativo web interno para uma empresa de comércio exterior (importação de vinhos) 

chamado "Fila de Aprovação de PO". O app usa Supabase como banco de dados.

CONTEXTO

Os Pedidos de Compra (PO) são criados e preenchidos em uma planilha externa (Google Sheets/

Excel), que continua sendo a fonte de dados do processo. Uma automação externa (Make) 

monitora essa planilha, gera o PDF da PO e grava o resultado neste banco de dados. 

Este app NÃO cadastra nem edita pedidos — ele só exibe os PDFs pendentes para uma gerente 

aprovar ou rejeitar, com registro permanente de cada decisão.

PERFIL DE USUÁRIO (Supabase Auth, e-mail/senha)

- "gerente": único perfil do app. Revisa os documentos pendentes e aprova ou rejeita.

MODELO DE DADOS

Tabela "documentos_po" (alimentada pela automação externa via Supabase, não pelo app):

- identificador (número do processo/PO, vindo da planilha)

- cliente

- exportador

- pdf_url

- status (pendente_aprovacao, aprovado, rejeitado, enviado)

- criado_em

- aprovado_por

- aprovado_em

Tabela "log_aprovacoes" (somente inserção, nunca editada ou apagada):

- documento_id

- status_anterior

- status_novo

- usuario

- data_hora

- observacao (motivo, obrigatório em caso de rejeição)

TELAS

1. Login.

2. Painel: lista de documentos com filtro por status e busca por identificador/cliente/

   exportador. Cada item mostra identificador, cliente, exportador e status, com destaque 

   visual para os pendentes.

3. Detalhe do documento: mostra a identificação e um preview do PDF embutido na tela 

   (abrir o pdf_url). Quando status = pendente_aprovacao, mostra os botões "Aprovar" e 

   "Rejeitar" (rejeitar exige preencher um motivo antes de confirmar). A ação grava uma 

   linha em log_aprovacoes e atualiza o status do documento.

4. Histórico geral: lista de todas as entradas de log_aprovacoes, com filtro por documento 

   e por data.

OUTROS REQUISITOS

- Interface em português do Brasil, responsiva (a gerente vai aprovar também pelo celular).

- Não crie nenhuma tela de cadastro/edição de pedido — os dados chegam prontos via 

  automação externa.

- Não implemente envio de e-mail nem geração de PDF dentro do app — isso é feito pela 

  automação externa (Make), que também escreve o status final de volta na planilha 

  original fora deste sistema.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://po-route.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7e132009-8af4-486b-bc56-b89229cd0f97).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
