# 🎭 Documentação da API Mock

Esta documentação detalha o funcionamento da camada mock do frontend, inspirada no fluxo do Calendly.

## Visão Geral

O mock (`src/mockApi.ts`) simula um backend completo para desenvolvimento e testes de UI/UX sem necessidade de servidor real.

## Estrutura de Dados Mock

### Agendamentos (Appointments)

```typescript
const mockAppointments: Appointment[] = [
  {
    id: "1",
    professional_id: "prof-1",
    patient_id: "patient-1",
    start_time: "2025-01-15T10:00:00Z",
    end_time: "2025-01-15T10:30:00Z",
    status: "scheduled"
  }
];
```

### Slots Disponíveis

```typescript
const mockAvailableSlots = [
  { start: "09:00", end: "09:30" },
  { start: "09:30", end: "10:00" },
  { start: "10:30", end: "11:00" },
  { start: "14:00", end: "14:30" },
  { start: "15:00", end: "15:30" },
  { start: "16:00", end: "16:30" },
];
```

### Profissionais

```typescript
[
  { id: "prof-1", name: "Dr. Silva", specialty: "Cardiologia" },
  { id: "prof-2", name: "Dra. Santos", specialty: "Dermatologia" },
  { id: "prof-3", name: "Dr. Oliveira", specialty: "Ortopedia" },
]
```

## Funções da API Mock

| Função | Descrição | Delay |
|--------|-----------|-------|
| `mockLogin()` | Autentica usuário | 300ms |
| `mockGetMyAppointments()` | Lista agendamentos do paciente | 200ms |
| `mockGetProviderAppointments()` | Lista agendamentos do período | 200ms |
| `mockSaveAgendaConfig()` | Salva configurações da agenda | 300ms |
| `mockGetAvailableSlots()` | Retorna slots disponíveis | 300ms |
| `mockCreateAppointment()` | Cria novo agendamento | 400ms |
| `mockCancelAppointment()` | Cancela agendamento | 300ms |
| `mockRescheduleAppointment()` | Reagenda consulta | 400ms |
| `mockGetProviders()` | Lista profissionais | 200ms |

## Características do Mock

- ✅ Delays artificiais para simular rede real
- ✅ Validações básicas (campos obrigatórios)
- ✅ Persistência em memória durante a sessão
- ✅ Estados de erro simulados
- ✅ IDs únicos gerados dinamicamente

## Fluxo Completo de Exemplo

```typescript
import { mockLogin, mockGetProviders, mockGetAvailableSlots, mockCreateAppointment } from "./mockApi";

async function exemploFluxoCompleto() {
  // 1. Login
  const token = await mockLogin("paciente@teste.com", "123", "customer");
  
  // 2. Listar profissionais
  const providers = await mockGetProviders();
  const selectedProvider = providers[0].id;
  
  // 3. Ver slots disponíveis
  const date = "2025-01-20";
  const slots = await mockGetAvailableSlots(selectedProvider, date);
  const selectedSlot = slots[0];
  
  // 4. Criar agendamento
  const startDateTime = new Date(`${date}T${selectedSlot.start}`);
  const endDateTime = new Date(`${date}T${selectedSlot.end}`);
  
  const appointment = await mockCreateAppointment(token, {
    professional_id: selectedProvider,
    start_time: startDateTime.toISOString(),
    end_time: endDateTime.toISOString()
  });
  
  console.log(`Agendamento criado: ${appointment.id}`);
}
```

## Comparação: Mock vs API Real

| Aspecto | Mock | API Real |
|---------|------|----------|
| Velocidade | Rápido (delay artificial) | Depende da rede |
| Dados | Estáticos/pré-definidos | Dinâmicos do banco |
| Persistência | Memória (perde ao recarregar) | Banco de dados |
| Validações | Básicas | Completas |
| Uso ideal | Dev, testes UI, demo | Produção |
