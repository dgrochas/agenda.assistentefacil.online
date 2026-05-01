# 📋 Agenda Assistente Fácil - Documentação Completa

Inspiração: **Calendly** - Sistema de agendamento inteligente e automatizado.

---

## 🏗️ Visão Geral da Arquitetura

### Backend (FastAPI + PostgreSQL)
- **Localização**: `/workspace/agenda-assistente-facil-api`
- **Python**: 3.10+
- **ORM**: SQLAlchemy
- **Migrações**: Alembic
- **Autenticação**: JWT + OAuth2 Google

### Frontend (React + TypeScript + Vite)
- **Localização**: `/workspace/agenda-assistente-facil-web`
- **React**: 18
- **Build**: Vite
- **Estilos**: CSS Nativo

---

## 👥 Perfis de Usuário

### 1. Provider (Profissional)
- Profissionais de saúde que oferecem consultas
- Podem configurar agenda, duração, buffers
- Visualizam agenda futura e histórico
- Integração com Google Calendar

### 2. Customer (Paciente)
- Pacientes que agendam consultas
- Selecionam profissionais disponíveis
- Visualizam horários livres em tempo real
- Gerenciam seus agendamentos

---

## 🗄️ Modelagem de Dados Atual

### UserProfessional
```python
- id: UUID (primary key)
- email: String (unique, indexed)
- hashed_password: String
- oauth_provider: String (nullable)
- refresh_token_encrypted: String (nullable)
- slug_url: String (unique, indexed) ← URL pública tipo Calendly
```

### UserPatient
```python
- id: UUID (primary key)
- email: String (unique, indexed)
- hashed_password: String
- full_name: String
- phone_number: String
```

### ConfigAgenda
```python
- id: UUID (primary key)
- professional_id: UUID (FK, unique)
- work_hours: JSON (configuração de horários de trabalho)
- slot_duration: Integer (default: 30 min)
- buffer_time: Integer (default: 10 min)
- cancellation_deadline_hours: Integer (default: 24h)
```

### Appointment
```python
- id: UUID (primary key)
- professional_id: UUID (FK, indexed)
- patient_id: UUID (FK, indexed)
- start_time: DateTime (timezone aware)
- end_time: DateTime (timezone aware)
- status: Enum [scheduled, canceled, completed]
- external_event_id: String (nullable) ← Google Calendar ID
```

---

## 🔌 Endpoints da API

### Autenticação (`/api/v1/auth`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/register/provider` | Registro de profissional |
| POST | `/register/customer` | Registro de paciente |
| POST | `/token` | Login (JWT) |
| GET | `/provider/google/start` | Iniciar OAuth Google |
| GET | `/provider/google/callback` | Callback OAuth Google |

### Configuração de Agenda (`/api/v1/agenda-config`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/me` | Obter configuração do profissional logado |
| PUT | `/me` | Atualizar configuração (duração, buffer, etc.) |

### Agendamentos (`/api/v1/appointments`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/` | Criar agendamento (paciente) |
| GET | `/me` | Listar agendamentos do paciente |
| GET | `/provider/me?start=&end=` | Listar agendamentos do profissional |
| GET | `/availability/{professional_id}` | Obter horários disponíveis |
| POST | `/{id}/cancel` | Cancelar agendamento |
| POST | `/{id}/reschedule` | Reagendar agendamento |
| POST | `/provider/reconcile` | Sincronizar com Google Calendar |

---

## 🧠 Serviços Principais

### 1. Cálculo de Disponibilidade (`availability.py`)
```python
calculate_available_slots(
    config: ConfigAgenda,
    busy_events: list[Appointment],
    period_start: datetime,
    period_end: datetime
) -> list[dict]
```

**Funcionamento:**
- Percorre o período em blocos de `slot_duration`
- Bloqueia slots que colidem com eventos ocupados
- Aplica `buffer_time` entre consultas
- Considera eventos do Google Calendar

### 2. Integração Google Calendar (`google_calendar.py`)
- `create_google_calendar_event()`: Cria evento na agenda externa
- `update_google_calendar_event()`: Atualiza evento existente
- `cancel_google_calendar_event()`: Remove evento cancelado
- `fetch_google_busy_slots()`: Busca ocupações externas
- `google_event_exists()`: Verifica existência do evento

---

## 🎯 Funcionalidades Inspiradas no Calendly

### ✅ Implementadas
1. **URL Slug por Profissional** (`slug_url`)
   - Base para página pública tipo `calendly.com/profissional`
   
2. **Configuração Flexível de Agenda**
   - Duração customizável por consulta
   - Buffer time entre compromissos
   - Prazo para cancelamento

3. **Disponibilidade em Tempo Real**
   - Cálculo dinâmico de slots livres
   - Integração bidirecional com Google Calendar

4. **Gestão Completa de Agendamentos**
   - Criar, cancelar, reagendar
   - Status tracking (scheduled/canceled/completed)

5. **Reconciliação de Calendário**
   - Detecta eventos removidos externamente
   - Atualiza status automaticamente

### 🚀 Próximas Implementações (Roadmap Calendly)

#### 1. Página Pública de Agendamento
**Endpoint**: `GET /public/{professional_slug}`
- Página web acessível sem login
- Exibe tipos de evento disponíveis
- Mostra calendário interativo com slots livres
- Formulário de agendamento simplificado

#### 2. Tipos de Evento Configuráveis
**Novo Modelo**: `EventType`
```python
- id: UUID
- professional_id: UUID (FK)
- name: String (ex: "Consulta Inicial", "Retorno")
- duration: Integer (minutos)
- description: Text
- price: Decimal (opcional)
- location: String (presencial/online/link)
- custom_questions: JSON (perguntas personalizadas)
- active: Boolean
```

#### 3. Disponibilidade Avançada
**Melhorias no `ConfigAgenda`:**
- Horários específicos por dia da semana
- Exceções (feriados, férias)
- Limites diários/semanais de agendamentos
- Buffers antes e depois diferenciados
- Janela de agendamento (ex: máximo 3 meses à frente)

#### 4. Workflow de Confirmação
- E-mail automático de confirmação
- Lembretes automáticos (24h, 1h antes)
- Follow-up pós-consulta
- Links de cancelamento/reagendamento por e-mail

#### 5. Integrações Adicionais
- Microsoft Outlook Calendar
- Zoom/Google Meet (links automáticos)
- Webhooks para notificações externas
- API pública para integrações third-party

#### 6. Dashboard Analítico
- Taxa de comparecimento
- Horários mais populares
- Tempo médio de agendamento
- Receita projetada (se houver preços)

---

## 📁 Estrutura de Diretórios

### Backend
```
agenda-assistente-facil-api/
├── app/
│   ├── main.py                 # Entry point FastAPI
│   ├── api/
│   │   ├── router.py           # Registro de rotas
│   │   ├── deps.py             # Dependências (auth, db)
│   │   └── routes/
│   │       ├── auth.py
│   │       ├── appointments.py
│   │       └── config_agenda.py
│   ├── core/                   # Configurações, segurança
│   ├── db/                     # Conexão DB
│   ├── models/
│   │   └── entities.py         # Modelos SQLAlchemy
│   ├── repositories/           # Camada de dados
│   ├── schemas/                # Pydantic schemas
│   └── services/
│       ├── availability.py     # Cálculo de slots
│       └── google_calendar.py  # Integração GCalendar
├── alembic/                    # Migrações de banco
├── tests/                      # Testes pytest
├── pyproject.toml              # Dependências Poetry
└── Makefile                    # Comandos comuns
```

### Frontend
```
agenda-assistente-facil-web/
├── src/
│   ├── main.tsx                # Entry point React
│   ├── App.tsx                 # Componente raiz
│   ├── api.ts                  # Cliente API
│   ├── mockApi.ts              # Mock para dev
│   ├── types.ts                # Tipos TypeScript
│   ├── styles.css              # Estilos globais
│   ├── components/
│   │   └── Layout.tsx
│   └── pages/
│       ├── LoginPage.tsx
│       ├── CustomerPage.tsx
│       └── ProviderPage.tsx
├── public/
├── package.json
└── vite.config.ts
```

---

## 🔐 Segurança

### Autenticação
- JWT tokens com expiração
- Refresh tokens (para OAuth)
- Senhas hasheadas com bcrypt

### Autorização
- RBAC (Role-Based Access Control)
- Validação de propriedade (owner check)
- Escopo por perfil (provider/customer)

### Dados Sensíveis
- `DATA_ENCRYPTION_KEY` para tokens OAuth
- HTTPS obrigatório em produção
- CORS configurado por ambiente

---

## 🧪 Testes

### Backend (pytest)
```bash
# Rodar todos os testes
make test

# Arquivos de teste
tests/test_api_flows.py        # Fluxos completos da API
tests/test_availability.py     # Lógica de disponibilidade
tests/conftest.py              # Fixtures e setup
```

### Frontend
- Modo mock habilitado para desenvolvimento
- Testes manuais via UI
- *Sugestão*: Implementar Jest + React Testing Library

---

## 🚀 Setup e Execução

### Backend
```bash
cd agenda-assistente-facil-api

# Instalar dependências
poetry install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com credenciais

# Rodar migrações
make db-upgrade

# Iniciar servidor
make run
# Ou: uv run uvicorn app.main:app --reload
```

### Frontend
```bash
cd agenda-assistente-facil-web

# Instalar dependências
npm install

# Configurar ambiente
# Editar .env:
# VITE_USE_MOCK=true (desenvolvimento)
# VITE_USE_MOCK=false (produção com API)

# Iniciar dev server
npm run dev
```

---

## 📊 Comparação: Atual vs Calendly

| Funcionalidade | Status Atual | Calendly Reference |
|----------------|--------------|-------------------|
| Perfil público | ✅ Slug URL | ✅ Full landing page |
| Tipos de evento | ❌ | ✅ Múltiplos tipos |
| Agenda configurável | ✅ Básico | ✅ Avançado (regras, exceções) |
| Integração GCalendar | ✅ Bidirecional | ✅ Multi-calendar |
| Página de booking | ❌ | ✅ Embeddable widget |
| E-mails automáticos | ❌ | ✅ Confirm/Remind/Followup |
| Pagamentos | ❌ | ✅ Stripe integration |
| Video conferência | ❌ | ✅ Auto-generate links |
| Webhooks | ❌ | ✅ Event notifications |
| Analytics | ❌ | ✅ Dashboard completo |
| Mobile app | ❌ | ✅ iOS/Android apps |
| Time zones | ⚠️ Parcial | ✅ Auto-detect + selector |
| Group events | ❌ | ✅ Webinars, group sessions |
| Round robin | ❌ | ✅ Team scheduling |
| Custom questions | ❌ | ✅ intake forms |

---

## 🎨 UX/UI - Lições do Calendly

### Princípios de Design
1. **Simplicidade**: Mínimo de cliques para agendar
2. **Clareza**: Disponibilidade visível de imediato
3. **Mobile-first**: Responsivo em qualquer dispositivo
4. **Personalização**: Branding do profissional
5. **Automação**: Zero trabalho manual após setup

### Fluxo Ideal de Agendamento
```
1. Usuário acessa link público
2. Escolhe tipo de evento
3. Vê calendário com slots disponíveis
4. Seleciona horário
5. Preenche dados básicos + perguntas customizadas
6. Confirma
7. Recebe e-mail de confirmação + invite calendar
8. Lembretes automáticos
9. Link de reunião (se online)
10. Follow-up pós-evento
```

---

## 📝 Glossário

- **Slot**: Período de tempo disponível para agendamento
- **Buffer**: Tempo de respiro entre consultas
- **Slug**: Identificador único na URL (ex: `dr-silva`)
- **Reconcile**: Sincronizar agenda interna com externa
- **Event Type**: Categoria de agendamento (consulta, reunião, etc.)
- **Webhook**: Notificação HTTP para sistemas externos

---

## 🔮 Visão de Futuro

### Fase 1: Fundação (Atual)
✅ CRUD de agendamentos  
✅ Autenticação JWT + OAuth  
✅ Integração Google Calendar  
✅ Cálculo básico de disponibilidade  

### Fase 2: Experiência Pública (Próximo)
🔄 Página de agendamento pública  
🔄 Tipos de evento múltiplos  
🔄 E-mails transacionais  
🔄 Timezone detection  

### Fase 3: Automação & Escala
⬜ Workflows automatizados  
⬜ Pagamentos online  
⬜ Vídeo conferência auto  
⬜ Analytics avançado  

### Fase 4: Enterprise
⬜ Team scheduling  
⬜ Round robin  
⬜ SSO corporativo  
⬜ API pública documentada  

---

## 🤝 Contribuição

Este projeto é open-source e segue boas práticas de desenvolvimento:
- Code reviews obrigatórios
- Testes para novas funcionalidades
- Documentação atualizada
- Commits semânticos

---

## 📄 Licença

MIT License - Consulte o arquivo LICENSE nos repositórios originais.

---

**Última atualização**: Dezembro 2024  
**Versão**: 1.0.0  
**Status**: Em desenvolvimento ativo
