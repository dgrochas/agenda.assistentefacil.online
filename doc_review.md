# Revisão do Documento de Especificação - Agenda Assistente Fácil

## ✅ Pontos Fortes

1. **Estrutura bem organizada** - Documento claro com separação lógica entre visão geral, perfis, funcionalidades e requisitos
2. **Backlog priorizado** - Classificação P1/P2/P3 muito útil para desenvolvimento iterativo
3. **LGPD incorporada** - Privacy by Design desde a concepção é excelente
4. **Stack técnica moderna** - FastAPI + SQLModel + Pydantic v2 é uma escolha sólida
5. **Requisitos não-funcionais completos** - Cobre segurança, desempenho e manutenibilidade

---

## ⚠️ Pontos de Atenção e Sugestões de Melhoria

### 1. **Inconsistência na Modelagem de Dados**

**Problema:** A seção 6.1 menciona `USER_PROFESSIONAL` e `USER_PATIENT` como tabelas separadas, mas isso pode gerar duplicação de dados básicos (e-mail, nome).

**Sugestão:** Considerar um modelo unificado:
```
USER (id, email, nome, tipo, created_at)
├── PROFESSIONAL_PROFILE (user_id, oauth_provider, refresh_token_encrypted, calendar_id)
├── PATIENT_PROFILE (user_id, phone_encrypted, password_hash)
└── CONFIG_AGENDA (professional_id, horarios, duracao, buffer)
```

**Benefício:** Facilita migração de perfil (se um paciente virar profissional) e centraliza autenticação.

---

### 2. **Fluxo de Agendamento - Etapa Missing**

**Problema:** O fluxo da seção 3.2 não contempla **conflito de race condition**. Dois pacientes podem selecionar o mesmo slot simultaneamente.

**Sugestão:** Adicionar etapa 4.5:
```
4.5 | Bloqueio otimista do slot | Sistema reserva o slot por 2-5 minutos enquanto paciente confirma dados
```

**Implementação técnica:**
- Usar Redis com TTL para lock temporário do slot
- Ou transação database com `SELECT FOR UPDATE` no PostgreSQL

---

### 3. **OAuth2 - Refresh Token Não Mencionado no Fluxo**

**Problema:** A seção 3.3 menciona armazenamento de refresh token, mas não descreve o fluxo de renovação automática.

**Sugestão:** Adicionar subsection:

#### 3.3.1 Renovação de Token OAuth2
- Monitorar expiração do access token (Google: 1h, Microsoft: 1h)
- Renovar automaticamente via refresh token antes da expiração
- Alertar profissional se refresh token expirar (requer re-autenticação)
- Retry com backoff exponencial em falhas de renovação

---

### 4. **Webhooks para Sincronização Bidirecional**

**Problema:** A seção 1.1 menciona sincronização "bidirecional", mas o documento só descreve push para Google/Outlook (etapa 5 do fluxo).

**Sugestão:** Adicionar mecanismo de webhook:
```
Google Calendar → Webhook → API → Atualiza APPOINTMENT.status
```

**Cenários cobertos:**
- Profissional cancela consulta diretamente no Google Calendar
- Profissional altera horário no calendário externo
- Evento externo é marcado como "busy" manualmente

**Endpoint necessário:** `POST /v1/webhooks/google-calendar`

---

### 5. **Tratamento de Fusos Horários**

**Problema:** Ausência total de menção a timezone. Profissional pode estar em SP, paciente em Lisboa.

**Sugestão:** Adicionar à seção 6.1:
```
PROFESSIONAL_PROFILE:
  - timezone: VARCHAR(50) DEFAULT 'America/Sao_Paulo'
  
APPOINTMENT:
  - scheduled_at_utc: TIMESTAMP WITH TIME ZONE
  - timezone_display: VARCHAR(50)  # Para exibição correta ao paciente
```

**Regra de negócio:** Todos os cálculos de disponibilidade em UTC, conversão apenas na camada de apresentação.

---

### 6. **Status do Agendamento - Enum Incompleto**

**Problema:** A seção 3.2 menciona status `confirmado`, mas não cobre outros estados possíveis.

**Sugestão:** Definir enum completo:
```python
class AppointmentStatus(str, Enum):
    PENDING = "pending"           # Aguardando confirmação do profissional (opcional)
    CONFIRMED = "confirmed"       # Confirmado automaticamente ou pelo profissional
    CANCELLED_BY_PATIENT = "cancelled_by_patient"
    CANCELLED_BY_PROVIDER = "cancelled_by_provider"
    RESCHEDULED = "rescheduled"
    NO_SHOW = "no_show"           # Paciente não compareceu
    COMPLETED = "completed"       # Consulta realizada
```

---

### 7. **Regras de Cancelamento - Muito Vago**

**Problema:** Seção 2.1 menciona "regras de cancelamento" mas não especifica quais parâmetros são configuráveis.

**Sugestão:** Detalhar em `CONFIG_AGENDA`:
```python
class CancellationRules(BaseModel):
    min_hours_before_cancel: int = 24  # Mínimo de horas para cancelar
    allow_reschedule: bool = True
    max_reschedules_per_appointment: int = 2
    cancellation_fee_percent: Optional[int] = None  # Para futuros pagamentos
```

---

### 8. **Rate Limiting Não Mencionado**

**Problema:** RNF-07 exige resposta em <2s, mas não há proteção contra abuso do endpoint de disponibilidade.

**Sugestão:** Adicionar RNF-14:
```
RNF-14 | Rate Limiting | Endpoint de disponibilidade limitado a 10 req/min por IP
                         para evitar scraping de agenda
```

**Implementação:** SlowAPI ou middleware customizado no FastAPI.

---

### 9. **Health Check e Monitoramento**

**Problema:** Ausência de endpoints operacionais para deploy em produção.

**Sugestão:** Adicionar à API:
```
GET /health          # Status básico (200 OK)
GET /health/live     # Liveness probe (Kubernetes)
GET /health/ready    # Readiness probe (checa DB, APIs externas)
GET /metrics         # Prometheus metrics (opcional P2)
```

---

### 10. **Plano de Rollback de Integração**

**Problema:** E se a inserção no Google Calendar (etapa 5) falhar após criar o agendamento no banco?

**Sugestão:** Adicionar política de compensação:
```
1. Criar APPOINTMENT no banco com status "pending_external_sync"
2. Tentar inserir no Google Calendar
3. Se sucesso: atualizar status para "confirmed"
4. Se falha: 
   - Retry automático (3x com backoff)
   - Se persistir falha: marcar como "sync_error" e notificar profissional
   - Paciente vê mensagem "aguardando confirmação final"
```

---

## 📋 Itens Faltantes no Backlog

| Funcionalidade | Perfil | Prio. | Justificativa |
|---|---|---|---|
| Recuperação de senha do paciente | Customer | P1 | Essencial para UX |
| Validação de e-mail no cadastro | Customer | P1 | Evita contas falsas e melhora deliverability |
| Logout e revogação de token | Ambos | P1 | Segurança básica |
| Testes automatizados (unitários + integração) | Dev | P1 | Qualidade do código |
| CI/CD pipeline | Dev | P1 | Deploy confiável |
| Backup automático do banco | Ops | P1 | Disaster recovery |
| Documentação da API (OpenAPI/Swagger) | Dev | P1 | Já nativo no FastAPI, mas precisa ser mantida |
| Ambiente de staging | Dev | P2 | Testes antes de produção |
| Logs de auditoria (quem fez o quê) | Ambos | P2 | LGPD e troubleshooting |
| Exportação de dados do usuário | Ambos | P2 | LGPD Art. 18 (portabilidade) |

---

## 🔐 Considerações de Segurança Adicionais

1. **Refresh Token Encryption**: Especificar algoritmo (ex: AES-256-GCM) e gestão de chaves
2. **JWT Expiration**: Definir tempos claros (ex: access=15min, refresh=7 dias para paciente)
3. **Password Policy**: Mínimo 8 caracteres, requerer números/símbolos?
4. **Brute Force Protection**: Lockout após 5 tentativas falhas de login
5. **SQL Injection**: SQLModel já protege, mas vale mencionar nos padrões
6. **XSS**: Sanitização de inputs do usuário (slug personalizado)

---

## 🚀 Recomendações de MVP

Considerando o backlog P1, sugiro esta ordem de implementação:

**Sprint 1-2: Fundação**
- Setup do projeto FastAPI + Docker
- Modelagem do banco (SQLModel)
- Autenticação JWT (provider + customer)
- CRUD básico de usuários

**Sprint 3-4: Core do Agendamento**
- OAuth2 Google (apenas Google no MVP)
- CONFIG_AGENDA (horários, duração, buffer)
- Integração Google FreeBusy API
- Cálculo de slots disponíveis

**Sprint 5-6: Fluxo Completo**
- Criação de agendamento
- Inserção no Google Calendar
- E-mail de confirmação (SendGrid/Resend)
- Histórico básico do paciente

**Sprint 7: Polimento**
- Dashboard do profissional
- Cancelamento/reagendamento
- Tratamento de erros e retry
- Deploy em produção

---

## 📝 Erros de Digitação/Formato

1. Seção 1.2: "api.assistentefacil.online" → garantir que o DNS esteja configurado
2. Tabela 2.1: "usuário pagável" → "usuário pagante"
3. Seção 3.1: "CONFIG_AGENDA" → manter consistência (às vezes com underscore, às vezes sem)

---

## Conclusão

O documento está **muito bom** como base para desenvolvimento. As principais lacunas são:
1. **Concorrência** (race conditions no agendamento)
2. **Timezone** (crítico para sistema multi-região)
3. **Webhooks** (para verdadeira sincronização bidirecional)
4. **Política de erro** (o que fazer quando integração falha)

Recomendo revisar antes de iniciar o desenvolvimento para evitar retrabalho.
