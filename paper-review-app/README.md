# Revisões (APK)

App Android para cadastrar os papers que tenho para revisar. Não usa API.
O app monta o pedido e abre o **app do Claude instalado no celular**, que lê o Gmail
pelo conector e devolve um JSON. Esse JSON volta para o app por "Compartilhar" ou "Colar".

## Fluxo

1. Toque em **Buscar e-mails com Claude**. O prompt é copiado e o Claude abre com ele.
2. No Claude, envie o prompt (o conector do Gmail precisa estar ativo).
3. Na resposta, use **Compartilhar → Importar em Revisões**, ou copie e toque em **Importar → Colar → Importar**.

A busca cobre `onbehalfof@manuscriptcentral.com` (ScholarOne: IJPR, JEIM, IJLSS, SCM, IMDS, BIJ...)
e `em@editorialmanager.com` (Elsevier: TFSC, IJPE...). A primeira busca vai 180 dias para trás
(ajustável em ⋯). As seguintes começam 3 dias antes da última importação.

Na importação, o status só avança (convidado → revisando → enviada/recusado), então o que foi
marcado à mão não regride por causa de um e-mail antigo. Minhas notas nunca são sobrescritas.

## Instalar

Cada push nesta pasta roda o workflow `APK Revisões`, que publica o release **apk-latest**
com `Revisoes.apk`. No celular, baixe o arquivo e permita "instalar apps desconhecidos".
A chave de assinatura fica no repo (`app/revisoes.keystore`), então cada versão nova instala
por cima da anterior sem perder dados.

Os dados ficam só no celular. Use ⋯ → **Exportar backup** de vez em quando.

## Build local

Requer Android SDK (platform 35) e Gradle 8.14: `gradle assembleRelease`.
