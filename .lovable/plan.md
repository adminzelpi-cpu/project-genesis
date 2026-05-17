

## Ajustes do Chat Inteligente — Plano Consolidado

As suas 3 anotações (abertura, comportamento geral, triggers proativos) se complementam e podem ser implementadas juntas. Abaixo minha análise com opinião sincera e o plano técnico.

---

### Minha Análise e Opinião

**O que já está bom:**
- Isolamento multi-tenant (toda query usa `store_id`) — seguro
- Tool Calling funciona (busca produtos, variações, medidas, políticas em tempo real)
- Carrossel de produtos no chat com compra rápida já existe
- Histórico persistente no banco

**O que precisa melhorar (concordo com tudo que você trouxe):**

1. **Abertura genérica** — Hoje na home sem histórico cai no fallback "Olá! Como posso ajudar?". Precisa ser útil e contextual desde a primeira frase.

2. **Respostas ainda podem ficar longas** — O prompt pede concisão mas a IA às vezes ignora. Precisa reforçar com regras mais rígidas.

3. **Comportamento de vendas sem camada de controle** — Hoje a IA pode inventar informações se a tool call falhar. Precisa de um fallback explícito ("não tenho essa informação, vou te direcionar").

4. **Configuração por lojista limitada** — Só tem nome, cor e mensagem de boas-vindas. Falta tom de voz e nível de proatividade.

5. **Sem triggers proativos** — O chat só age quando o usuário clica no botão. Não detecta inatividade na página de produto nem abertura do mini carrinho.

6. **Sem ações rápidas** — Não tem botões clicáveis na abertura.

7. **Sem métricas** — Não rastreia taxa de interação, continuação ou impacto na conversão.

**Minhas sugestões/correções às suas ideias:**

- **Ações rápidas**: Ótima ideia. Sugiro que sejam contextuais (na página de produto: "Me ajudar com tamanho" / "Ver opções parecidas"; na home: "Ver mais vendidos" / "Me ajudar a escolher"). O botão "Falar no WhatsApp" só deve aparecer se a loja tiver WhatsApp configurado.

- **Trigger no mini carrinho**: Concordo, mas sugiro que seja **só quando o carrinho tem itens e o usuário fica parado** — não quando está ativamente removendo/adicionando itens.

- **Limite de triggers por sessão**: 1 trigger proativo por sessão é o ideal. 2 no máximo fica arriscado de irritar.

- **Camada de regras antes da IA**: Tecnicamente isso já é feito via system prompt + tool calling. A IA só responde com dados que busca via tools. O reforço que falta é no prompt: "Se a tool retornou erro ou vazio, NUNCA invente. Diga que vai verificar e ofereça WhatsApp da loja."

- **Métricas**: Podemos criar uma tabela `chat_analytics` simples que registra: abertura do chat, primeira mensagem enviada, mensagens trocadas, clique em ação rápida, produto adicionado via chat. Isso responde todas as métricas que você quer.

---

### Plano de Implementação

#### Parte 1 — Migração de Banco

**Tabela `chat_analytics`** (nova):
- `id`, `store_id`, `session_id`, `event_type` (opened, first_message, message_sent, quick_action_click, product_added, checkout_redirect), `metadata` (jsonb), `created_at`
- RLS: lojista vê analytics da própria loja

**Alterar `store_chat_settings`** (adicionar colunas):
- `tone` (text, default 'casual') — formal/casual
- `proactivity_level` (text, default 'medium') — low/medium/high
- `proactive_delay_seconds` (int, default 30) — tempo de inatividade antes do trigger
- `whatsapp_fallback` (text, nullable) — número de WhatsApp para fallback humano

#### Parte 2 — Edge Function `store-chat` (ajustes)

1. **Mensagem de abertura contextual melhorada:**
   - Home → "Posso te mostrar os mais vendidos ou te ajudar a encontrar algo. O que prefere?"
   - Produto → usa dados reais do produto (já faz, mas melhorar o prompt)
   - Carrinho → "Posso te ajudar a finalizar ou tirar alguma dúvida sobre seus itens?"

2. **Camada de segurança no prompt:**
   - Regra explícita: "Se a ferramenta retornou erro ou dados vazios, NUNCA invente. Diga 'não encontrei essa informação' e ofereça alternativa."
   - Proibição: "NUNCA mencione dados de outras lojas ou informações que não vieram das ferramentas."

3. **Tom de voz dinâmico:**
   - Ler `tone` e `proactivity_level` do `store_chat_settings`
   - Injetar no system prompt: "Seu tom é {formal/casual}. Seu nível de proatividade é {baixo/médio/alto}."

4. **Concisão reforçada:**
   - Regra no prompt: "MÁXIMO 2 frases por resposta. Se precisar de mais, pergunte se o cliente quer detalhes."

#### Parte 3 — Frontend: Ações Rápidas

Na primeira mensagem do chat (greeting), renderizar **botões clicáveis** abaixo da mensagem:
- Contextual por página (home vs produto vs carrinho)
- Ao clicar, envia a mensagem correspondente como se o usuário tivesse digitado
- Botão WhatsApp só aparece se `whatsapp_fallback` estiver configurado

#### Parte 4 — Frontend: Triggers Proativos

Novo hook `useChatProactiveTrigger`:
- **Página de produto**: após X segundos de inatividade (configurável, default 30s), exibe bolinha do chat com preview da mensagem (tooltip/badge)
- **Mini carrinho**: detecta abertura do mini carrinho + permanência de 10s → mostra sugestão sutil
- Anti-spam: máximo 1 trigger por sessão, controlado via `sessionStorage`
- NÃO abre o chat automaticamente — só mostra preview/badge na bolinha

#### Parte 5 — Métricas

- Registrar eventos no `chat_analytics` via chamada ao banco (insert direto via supabase client no frontend)
- Dashboard do lojista: card simples mostrando taxa de abertura, interação e produtos adicionados via chat

---

### Ordem de Execução

1. Migração de banco (tabela + colunas)
2. Edge Function (prompt melhorado, camada de segurança, tom dinâmico)
3. Frontend: ações rápidas na abertura
4. Frontend: triggers proativos
5. Frontend: registro de métricas
6. Dashboard: visualização das métricas

Posso implementar tudo junto ou em partes — sugiro ir em 2 blocos: **(1+2+3)** e depois **(4+5+6)**, para testar a abertura e prompt antes dos triggers.

