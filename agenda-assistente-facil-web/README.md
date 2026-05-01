# 🏥 Agenda Assistente Fácil - Frontend

Frontend React/TypeScript para o sistema de agendamento de consultas médicas, **inspirado no Calendly** com interface moderna e intuitiva.

## 🎨 Inspiração no Calendly

Este projeto foi desenvolvido tomando como referência as melhores práticas de UX/UI do **Calendly**, incluindo:

- ✅ **Seleção visual de horários** em grid interativo
- ✅ **Fluxo simplificado** de agendamento em poucos cliques
- ✅ **Feedback visual imediato** para ações do usuário
- ✅ **Design limpo e moderno** com foco na usabilidade
- ✅ **Responsividade** para dispositivos móveis e desktop
- ✅ **Estados vazios** informativos quando não há dados
- ✅ **Badges de status** coloridos para identificação rápida

### 📸 Funcionalidades Inspiradas no Calendly

| Funcionalidade | Descrição |
|---------------|-----------|
| **Grid de Horários** | Slots de tempo exibidos em cards clicáveis com hover effect |
| **Seleção em Duas Etapas** | 1️⃣ Escolha data → 2️⃣ Escolha horário |
| **Confirmação Visual** | Slot selecionado muda de cor para feedback imediato |
| **Fluxo Contínuo** | Sem recarregamento de página (SPA) |
| **Status Colorido** | Verde (agendado), Vermelho (cancelado), Azul (realizado) |

## 🚀 Funcionalidades Implementadas

### 👤 Paciente (Customer)
- ✅ Login simplificado
- ✅ Seleção de profissional com especialidade
- ✅ Visualização de horários disponíveis em grid
- ✅ Agendamento de consultas com confirmação visual
- ✅ Cancelamento de agendamentos com confirmação
- ✅ Reagendamento de consultas
- ✅ Histórico de consultas (passadas e futuras)
- ✅ Status visual dos agendamentos (cores e badges)
- ✅ Feedback de sucesso/erro em tempo real

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
- **Fontes Google** (Inter)
- **Variáveis CSS** para consistência visual

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

### Modo Mock (Padrão) 🎭
Usa dados fictícios para desenvolvimento e demonstração. Ideal para testar a UI sem precisar do backend.

**Vantagens do Mock:**
- Desenvolvimento offline
- Testes rápidos de UI/UX
- Demonstração para stakeholders
- Prototipagem de novas features

### Modo API Real 🔌
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
├── api.ts              # Camada de API (mock ou real) - Router que decide qual usar
├── mockApi.ts          # Dados e funções mock - Simula backend completo
├── types.ts            # Tipos TypeScript - Contratos de dados
├── App.tsx             # Componente principal - Gerenciamento de rotas e estado global
├── main.tsx            # Entry point - Renderização da aplicação
├── styles.css          # Estilos globais - Design system inspirado no Calendly
├── components/
│   └── Layout.tsx      # Layout compartilhado - Header, container e estrutura base
└── pages/
    ├── LoginPage.tsx   # Tela de login - Interface simples e direta
    ├── CustomerPage.tsx # Painel do paciente - Fluxo de agendamento estilo Calendly
    └── ProviderPage.tsx # Painel do profissional - Gestão de agenda e configurações
```

## 🎭 Documentação do Mock

### Arquitetura da Camada Mock

O mock é implementado em `src/mockApi.ts` e simula todas as operações de backend:

#### 1. **Dados Fictícios**

```typescript
// Agendamentos pré-definidos
const mockAppointments: Appointment[] = [...]

// Slots de horário disponíveis
const mockAvailableSlots = [
  { start: "09:00", end: "09:30" },
  { start: "09:30", end: "10:00" },
  // ...
]

// Profissionais disponíveis
const mockProviders = [
  { id: "prof-1", name: "Dr. Silva", specialty: "Cardiologia" },
  { id: "prof-2", name: "Dra. Santos", specialty: "Dermatologia" },
  // ...
]
```

#### 2. **Funções Mock Disponíveis**

| Função | Descrição | Delay Simulado |
|--------|-----------|----------------|
| `mockLogin()` | Autentica usuário | 300ms |
| `mockGetMyAppointments()` | Lista agendamentos do paciente | 200ms |
| `mockGetProviderAppointments()` | Lista agendamentos do período | 200ms |
| `mockSaveAgendaConfig()` | Salva configurações da agenda | 300ms |
| `mockGetAvailableSlots()` | Retorna slots disponíveis | 300ms |
| `mockCreateAppointment()` | Cria novo agendamento | 400ms |
| `mockCancelAppointment()` | Cancela agendamento | 300ms |
| `mockRescheduleAppointment()` | Reagenda consulta | 400ms |
| `mockGetProviders()` | Lista profissionais | 200ms |

#### 3. **Como o Mock Funciona**

```typescript
// Exemplo: mockGetAvailableSlots
export async function mockGetAvailableSlots(
  professionalId: string, 
  date: string
): Promise<typeof mockAvailableSlots> {
  await delay(300); // Simula latência de rede
  return mockAvailableSlots; // Retorna dados estáticos
}
```

**Características:**
- ✅ Delays artificiais para simular rede real
- ✅ Validações básicas (campos obrigatórios)
- ✅ Persistência em memória durante a sessão
- ✅ Estados de erro simulados
- ✅ IDs únicos gerados dinamicamente

#### 4. **Alternância Mock/API Real**

O arquivo `src/api.ts` atua como router:

```typescript
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export async function getAvailableSlots(professionalId: string, date: string) {
  if (USE_MOCK) {
    return mockGetAvailableSlots(professionalId, date);
  }
  // Chamada HTTP real para API
}
```

## 🎨 Design System (Inspirado no Calendly)

### Paleta de Cores

| Cor | Hex | Uso |
|-----|-----|-----|
| Primary | `#0ea5e9` | Botões principais, links, estados ativos |
| Primary Dark | `#0284c7` | Hover de botões |
| Background | `#f0f9ff` → `#e0f2fe` | Gradiente de fundo |
| Surface | `#ffffff` | Cards e containers |
| Text Primary | `#1e293b` | Títulos e textos importantes |
| Text Secondary | `#64748b` | Descrições e textos secundários |
| Border | `#e2e8f0` | Bordas e divisórias |
| Success | `#16a34a` | Confirmações, status "agendado" |
| Danger | `#dc2626` | Erros, cancelamentos |
| Info | `#1e40af` | Informações, status "realizado" |

### Componentes Visuais

#### 1. **Cards**
```css
.card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
}
```

#### 2. **Grid de Slots (Estilo Calendly)**
```css
.slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
}

.slot-button {
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.slot-button.selected {
  background: #0ea5e9;
  color: white;
}
```

#### 3. **Badges de Status**
```css
.badge-success { /* Agendado */
  background: #dcfce7;
  color: #166534;
}

.badge-danger { /* Cancelado */
  background: #fee2e2;
  color: #991b1b;
}

.badge-info { /* Realizado */
  background: #dbeafe;
  color: #1e40af;
}
```

#### 4. **Botões**
- **Primary**: Gradiente azul, sombra suave, hover com elevação
- **Secondary**: Branco com borda, hover sutil
- **Danger**: Fundo vermelho claro, texto vermelho
- **Small**: Versão compacta para ações em lista

### Tipografia

- **Fonte**: Inter (Google Fonts)
- **Pesos**: 300, 400, 500, 600, 700
- **Tamanhos**:
  - H1: 2rem (32px)
  - H2: 1.5rem (24px)
  - H3: 1.25rem (20px)
  - Body: 0.9375rem (15px)
  - Small: 0.875rem (14px)

## 🔄 Fluxos do Usuário

### Fluxo de Agendamento (Paciente)

```
1. Login
   ↓
2. Dashboard do Paciente
   ↓
3. Clicar em "+ Novo Agendamento"
   ↓
4. Selecionar Profissional (dropdown)
   ↓
5. Selecionar Data (date picker)
   ↓
6. Clicar em "Ver Horários Disponíveis"
   ↓
7. Grid de slots carrega com delay simulado
   ↓
8. Clicar em um slot disponível
   ↓
9. Slot fica destacado (azul)
   ↓
10. Clicar em "Confirmar Agendamento"
    ↓
11. Mensagem de sucesso aparece
    ↓
12. Agendamento aparece na lista "Próximos Agendamentos"
```

### Fluxo de Reagendamento

```
1. Paciente clica em "🔄 Reagendar" em um agendamento
   ↓
2. Formulário de agendamento abre
   ↓
3. Data e profissional são preenchidos automaticamente
   ↓
4. Slots da data são carregados
   ↓
5. Paciente seleciona novo slot
   ↓
6. Clica em "Confirmar Reagendamento"
   ↓
7. Agendamento é atualizado
```

### Fluxo de Cancelamento

```
1. Paciente clica em "✕ Cancelar"
   ↓
2. Modal de confirmação nativo aparece
   ↓
3. Se confirmar:
   - Status muda para "cancelado"
   - Badge vermelho é exibido
   - Mensagem de sucesso aparece
```

## 🧪 Testando o Mock

### Cenário 1: Agendamento Completo

```typescript
// 1. Login
await mockLogin("paciente@teste.com", "123456", "customer");

// 2. Listar profissionais
const providers = await mockGetProviders();
// Retorna: Dr. Silva, Dra. Santos, Dr. Oliveira

// 3. Ver slots disponíveis
const slots = await mockGetAvailableSlots("prof-1", "2025-01-15");
// Retorna: 6 slots de 30 minutos

// 4. Criar agendamento
const appointment = await mockCreateAppointment(token, {
  professional_id: "prof-1",
  start_time: "2025-01-15T09:00:00",
  end_time: "2025-01-15T09:30:00"
});

// 5. Listar meus agendamentos
const myAppointments = await mockGetMyAppointments(token);
// Inclui o novo agendamento
```

### Cenário 2: Cancelamento e Reagendamento

```typescript
// Cancelar
await mockCancelAppointment(token, "1");

// Reagendar
await mockRescheduleAppointment(
  token,
  "2",
  "2025-01-20T14:00:00",
  "2025-01-20T14:30:00"
);
```

## 📊 Estados da Interface

### Estados de Loading
- Spinner animado durante carregamento de slots
- Botões desabilitados enquanto processa
- Texto "Carregando..." com ícone

### Estados Vazios
- "Você não tem agendamentos futuros."
- "Nenhum horário disponível para esta data."
- Ícones e mensagens amigáveis

### Estados de Erro
- Mensagens em vermelho com fundo claro
- Borda esquerda colorida para destaque
- Texto descritivo do erro

### Estados de Sucesso
- Mensagens em verde com fundo claro
- Auto-desaparecimento (futuramente)
- Feedback imediato após ação

## 🔌 Integração com Backend Real

Quando estiver pronto para usar a API real:

1. **Configure o `.env`**:
```bash
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:8000/api/v1
```

2. **Endpoints Esperados**:
- `POST /auth/login` - Login
- `GET /appointments/my` - Meus agendamentos
- `GET /appointments/provider` - Agendamentos do profissional
- `GET /slots/available` - Slots disponíveis
- `POST /appointments` - Criar agendamento
- `POST /appointments/{id}/cancel` - Cancelar
- `POST /appointments/{id}/reschedule` - Reagendar
- `GET /providers` - Listar profissionais
- `PUT /agenda/config` - Configurar agenda

3. **Formato das Respostas**:
O backend deve retornar dados no mesmo formato do mock para compatibilidade.

## 🎯 Próximos Passos

### Melhorias de UI/UX (Estilo Calendly)
- [ ] Animações de transição entre telas
- [ ] Skeleton loading durante carregamento
- [ ] Tooltips explicativos
- [ ] Preview do agendamento antes de confirmar
- [ ] Seleção de fuso horário
- [ ] Integração com Google Calendar OAuth2
- [ ] Sincronização automática de eventos
- [ ] Cálculo de slots baseado na agenda externa
- [ ] Notificações por e-mail/WhatsApp
- [ ] Upload de foto do perfil
- [ ] Chat entre paciente e profissional
- [ ] Lembretes automáticos
- [ ] Avaliação pós-consulta

### Melhorias Técnicas
- [ ] Tests unitários para componentes
- [ ] Tests E2E com Cypress/Playwright
- [ ] Error boundaries
- [ ] Lazy loading de componentes
- [ ] Otimização de bundle
- [ ] PWA para instalação mobile

## 📝 Licença

MIT
