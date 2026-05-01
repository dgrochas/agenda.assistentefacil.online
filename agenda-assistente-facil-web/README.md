# 🏥 Agenda Assistente Fácil - Frontend

Frontend React/TypeScript para o sistema de agendamento de consultas médicas.

## 🚀 Funcionalidades Implementadas

### 👤 Paciente (Customer)
- ✅ Login simplificado
- ✅ Seleção de profissional
- ✅ Visualização de horários disponíveis
- ✅ Agendamento de consultas
- ✅ Cancelamento de agendamentos
- ✅ Reagendamento de consultas
- ✅ Histórico de consultas (passadas e futuras)
- ✅ Status visual dos agendamentos (cores)

### 👨‍⚕️ Profissional (Provider)
- ✅ Dashboard de agendamentos
- ✅ Configuração de duração de consulta
- ✅ Configuração de tempo de respiro (buffer)
- ✅ Prazo para cancelamento
- ✅ Visualização de agenda futura
- ✅ Histórico de atendimentos

## 🛠️ Tecnologias

- **React 18** com TypeScript
- **Vite** para build e dev server
- **CSS Nativo** (sem dependências extras)

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

## ⚙️ Configuração

O frontend opera em dois modos:

### Modo Mock (Padrão)
Usa dados fictícios para desenvolvimento e demonstração. Ideal para testar a UI sem precisar do backend.

### Modo API Real
Conecta com o backend FastAPI.

Para alternar entre os modos, edite o arquivo `.env`:

```bash
# Usar mock (dados fictícios)
VITE_USE_MOCK=true

# Usar API real
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:8000/api/v1
```

## 🌐 Acessando a Aplicação

Com o servidor de desenvolvimento rodando:

```
http://localhost:5173
```

## 🔑 Credenciais de Teste (Modo Mock)

No modo mock, você pode usar **qualquer e-mail e senha** para login:

- **Paciente**: qualquer@email.com / senha123
- **Profissional**: prof@email.com / senha123

## 📁 Estrutura de Arquivos

```
src/
├── api.ts              # Camada de API (mock ou real)
├── mockApi.ts          # Dados e funções mock
├── types.ts            # Tipos TypeScript
├── App.tsx             # Componente principal
├── main.tsx            # Entry point
├── styles.css          # Estilos globais
├── components/
│   └── Layout.tsx      # Layout compartilhado
└── pages/
    ├── LoginPage.tsx   # Tela de login
    ├── CustomerPage.tsx # Painel do paciente
    └── ProviderPage.tsx # Painel do profissional
```

## 🔄 Próximos Passos

- [ ] Integração com Google Calendar OAuth2
- [ ] Sincronização automática de eventos
- [ ] Cálculo de slots baseado na agenda externa
- [ ] Notificações por e-mail/WhatsApp
- [ ] Upload de foto do perfil
- [ ] Chat entre paciente e profissional

## 📝 Licença

MIT
