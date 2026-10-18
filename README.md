# Finance AI — PWA para iPhone

Aplicativo web instalável para controle financeiro pessoal. Inclui cadastro e exclusão de receitas/despesas, filtros, dashboard, categorias, previsão simples, analista local e exportação JSON.

## Dados e privacidade
- Os registros são guardados em `localStorage` no navegador/dispositivo.
- Não há backend, login, sincronização em nuvem, conexão bancária ou modelo de IA remoto.
- Faça backups periódicos usando “Exportar dados em JSON”. Limpar dados do Safari pode apagar os registros.
- Os dados de exemplo são inseridos na primeira abertura para demonstração. Use “Apagar todas as transações” para começar do zero.

## Publicar e instalar no iPhone
1. Hospede estes arquivos em um site HTTPS. Uma opção é GitHub Pages (repositório público se usar GitHub Free).
2. No iPhone, abra o endereço publicado no Safari.
3. Toque em Compartilhar → Adicionar à Tela de Início. Ative “Abrir como App da Web”, se a opção aparecer, e toque em Adicionar.
4. Abra pelo ícone. Para preservar dados, não limpe os dados do site no Safari e mantenha backups.

## Arquivos
- `index.html`: aplicativo e interface.
- `manifest.json`: metadados de instalação.
- `sw.js`: cache offline básico.
- `icon-192.png`, `icon-512.png`: ícones.

## Próxima etapa para uso real
Para sincronização entre dispositivos, login e IA conectada, implemente backend com autenticação, banco de dados, regras de acesso e API protegida. Nunca coloque chaves secretas de IA no JavaScript publicado. Não use dados bancários reais antes de implementar controles de segurança e backup adequados.
