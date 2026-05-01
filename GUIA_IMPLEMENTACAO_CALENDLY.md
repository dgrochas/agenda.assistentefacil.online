# 🚀 Guia de Implementação - Funcionalidades Calendly

Este guia fornece exemplos práticos de código para implementar funcionalidades inspiradas no Calendly.

---

## 1️⃣ Página Pública de Agendamento

### Backend: Novo Endpoint Público

**Arquivo**: `agenda-assistente-facil-api/app/api/routes/public.py`

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime

from app.api.deps import get_db_session
from app.repositories.users import UserRepository
from app.repositories.config_agenda import ConfigAgendaRepository
from app.repositories.appointments import AppointmentRepository
from app.services.availability import calculate_available_slots
from app.schemas.appointment import AppointmentCreateIn, AppointmentOut

router = APIRouter(prefix="/public", tags=["public-booking"])

user_repo = UserRepository()
config_repo = ConfigAgendaRepository()
appointment_repo = AppointmentRepository()


@router.get("/{professional_slug}")
async def get_professional_public_info(
    professional_slug: str,
    session: Session = Depends(get_db_session),
):
    """
    Obtém informações públicas de um profissional pelo slug.
    Similar a: calendly.com/dr-silva
    """
    professional = user_repo.get_professional_by_slug(session, professional_slug)
    if not professional:
        raise HTTPException(status_code=404, detail="Profissional não encontrado.")
    
    config = config_repo.get_by_professional_id(session, professional.id)
    
    return {
        "professional_id": str(professional.id),
        "slug": professional.slug_url,
        "email": professional.email,
        "config": {
            "slot_duration": config.slot_duration if config else 30,
            "buffer_time": config.buffer_time if config else 10,
        } if config else None,
    }


@router.get("/{professional_slug}/availability")
async def get_public_availability(
    professional_slug: str,
    start: datetime = Query(..., description="Data/hora inicial (ISO 8601)"),
    end: datetime = Query(..., description="Data/hora final (ISO 8601)"),
    session: Session = Depends(get_db_session),
):
    """
    Obtém horários disponíveis para agendamento público.
    Não requer autenticação.
    """
    professional = user_repo.get_professional_by_slug(session, professional_slug)
    if not professional:
        raise HTTPException(status_code=404, detail="Profissional não encontrado.")
    
    config = config_repo.get_by_professional_id(session, professional.id)
    if not config:
        return {
            "professional_slug": professional_slug,
            "slots": [],
            "message": "Profissional ainda não configurou sua agenda."
        }
    
    # Busca agendamentos existentes
    busy_events = appointment_repo.list_busy_for_professional(
        session, professional.id, start, end
    )
    
    # Considera Google Calendar se disponível
    google_busy = []
    if professional.refresh_token_encrypted:
        from app.services.google_calendar import fetch_google_busy_slots
        google_busy = await fetch_google_busy_slots(professional, start, end)
    
    # Calcula slots disponíveis
    slots = calculate_available_slots(config, [*busy_events, *google_busy], start, end)
    
    return {
        "professional_slug": professional_slug,
        "professional_id": str(professional.id),
        "slots": slots,
    }


@router.post("/{professional_slug}/book", response_model=AppointmentOut)
async def public_book_appointment(
    professional_slug: str,
    payload: AppointmentCreateIn,
    session: Session = Depends(get_db_session),
):
    """
    Permite agendamento público sem login.
    O paciente será criado automaticamente ou identificado pelo email.
    """
    professional = user_repo.get_professional_by_slug(session, professional_slug)
    if not professional:
        raise HTTPException(status_code=404, detail="Profissional não encontrado.")
    
    # Validações básicas
    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="Intervalo de horário inválido.")
    
    # Verifica conflito
    has_conflict = appointment_repo.has_overlapping_scheduled(
        session=session,
        professional_id=professional.id,
        start=payload.start_time,
        end=payload.end_time,
    )
    if has_conflict:
        raise HTTPException(status_code=409, detail="Horário indisponível.")
    
    # Cria ou busca paciente pelo email
    patient = user_repo.get_patient_by_email(session, payload.patient_email)
    if not patient:
        # Cria paciente automático (senha aleatória)
        import secrets
        from app.core.security import get_password_hash
        temp_password = secrets.token_urlsafe(16)
        
        patient_data = {
            "email": payload.patient_email,
            "hashed_password": get_password_hash(temp_password),
            "full_name": payload.patient_name,
            "phone_number": payload.patient_phone or "",
        }
        patient = user_repo.create_patient(session, patient_data)
        
        # TODO: Enviar e-mail com credenciais temporárias
    
    # Cria agendamento
    from app.models.entities import Appointment
    entity = Appointment(
        professional_id=professional.id,
        patient_id=patient.id,
        start_time=payload.start_time,
        end_time=payload.end_time,
    )
    created = appointment_repo.create(session, entity)
    
    # Integra com Google Calendar
    external_event_id = None
    if professional.refresh_token_encrypted:
        from app.services.google_calendar import create_google_calendar_event
        external_event_id = await create_google_calendar_event(
            professional, created, patient.email
        )
        if external_event_id:
            created.external_event_id = external_event_id
            session.add(created)
            session.commit()
            session.refresh(created)
    
    # TODO: Enviar e-mail de confirmação para paciente e profissional
    
    return AppointmentOut.model_validate(created, from_attributes=True)
```

---

### Frontend: Componente de Booking Público

**Arquivo**: `agenda-assistente-facil-web/src/pages/PublicBookingPage.tsx`

```typescript
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";

interface TimeSlot {
  start_time: string;
  end_time: string;
}

interface ProfessionalInfo {
  professional_id: string;
  slug: string;
  email: string;
  config?: {
    slot_duration: number;
    buffer_time: number;
  };
}

export function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  
  const [professional, setProfessional] = useState<ProfessionalInfo | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingForm, setBookingForm] = useState({
    patient_name: "",
    patient_email: "",
    patient_phone: "",
  });
  const [bookingStatus, setBookingStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  // Carrega informações do profissional
  useEffect(() => {
    async function loadProfessional() {
      try {
        const response = await fetch(`/api/v1/public/${slug}`);
        if (!response.ok) throw new Error("Profissional não encontrado");
        const data = await response.json();
        setProfessional(data);
        
        // Carrega slots disponíveis (próximos 7 dias)
        await loadAvailability(data.professional_id);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    
    if (slug) {
      loadProfessional();
    }
  }, [slug]);

  // Carrega disponibilidade
  async function loadAvailability(professionalId: string) {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7); // Próximos 7 dias
    
    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
    });
    
    try {
      const response = await fetch(`/api/v1/public/${slug}/availability?${params}`);
      const data = await response.json();
      setSlots(data.slots || []);
    } catch (error) {
      console.error("Erro ao carregar disponibilidade:", error);
    }
  }

  // Realiza agendamento
  async function handleBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot || !professional) return;
    
    setBookingStatus("submitting");
    
    try {
      const response = await fetch(`/api/v1/public/${slug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professional_id: professional.professional_id,
          patient_email: bookingForm.patient_email,
          patient_name: bookingForm.patient_name,
          patient_phone: bookingForm.patient_phone,
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Erro ao agendar");
      }
      
      setBookingStatus("success");
    } catch (error: any) {
      console.error(error);
      setBookingStatus("error");
    }
  }

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  if (!professional) {
    return (
      <div className="error">
        <h1>Profissional não encontrado</h1>
        <p>O link acessado é inválido ou expirou.</p>
      </div>
    );
  }

  if (bookingStatus === "success") {
    return (
      <div className="success-message">
        <h1>✅ Agendamento Confirmado!</h1>
        <p>Enviamos um e-mail de confirmação para {bookingForm.patient_email}</p>
        <button onClick={() => window.location.reload()}>
          Novo Agendamento
        </button>
      </div>
    );
  }

  return (
    <div className="public-booking-page">
      <header className="booking-header">
        <h1>Agende sua consulta</h1>
        <p className="professional-name">{professional.email}</p>
      </header>

      <div className="booking-content">
        {/* Seleção de Horário */}
        <section className="time-selection">
          <h2>Selecione um horário disponível</h2>
          {slots.length === 0 ? (
            <p className="no-slots">Nenhum horário disponível nos próximos 7 dias.</p>
          ) : (
            <div className="slots-grid">
              {slots.map((slot, index) => (
                <button
                  key={index}
                  className={`time-slot ${selectedSlot === slot ? "selected" : ""}`}
                  onClick={() => setSelectedSlot(slot)}
                >
                  {new Date(slot.start_time).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Formulário de Dados */}
        {selectedSlot && (
          <form className="booking-form" onSubmit={handleBooking}>
            <h2>Seus Dados</h2>
            
            <div className="form-group">
              <label>Nome Completo</label>
              <input
                type="text"
                required
                value={bookingForm.patient_name}
                onChange={(e) =>
                  setBookingForm({ ...bookingForm, patient_name: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>E-mail</label>
              <input
                type="email"
                required
                value={bookingForm.patient_email}
                onChange={(e) =>
                  setBookingForm({ ...bookingForm, patient_email: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Telefone (opcional)</label>
              <input
                type="tel"
                value={bookingForm.patient_phone}
                onChange={(e) =>
                  setBookingForm({ ...bookingForm, patient_phone: e.target.value })
                }
              />
            </div>

            <div className="form-summary">
              <h3>Resumo do Agendamento</h3>
              <p>
                📅 {new Date(selectedSlot.start_time).toLocaleDateString("pt-BR")} às{" "}
                {new Date(selectedSlot.start_time).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <button 
              type="submit" 
              className="btn-confirm"
              disabled={bookingStatus === "submitting"}
            >
              {bookingStatus === "submitting" ? "Agendando..." : "Confirmar Agendamento"}
            </button>
          </form>
        )}
      </div>

      {bookingStatus === "error" && (
        <div className="error-message">
          <p>❌ Erro ao realizar agendamento. Tente novamente.</p>
        </div>
      )}
    </div>
  );
}
```

---

## 2️⃣ Tipos de Evento Configuráveis

### Backend: Novo Modelo e Endpoints

**Arquivo**: `agenda-assistente-facil-api/app/models/entities.py` (adicionar)

```python
class EventType(Base):
    __tablename__ = "eventtype"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    professional_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("userprofessional.id"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    price: Mapped[Optional[float]] = mapped_column(nullable=True)
    location_type: Mapped[str] = mapped_column(
        String(50), default="in_person"  # in_person, online, phone
    )
    location_details: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    custom_questions: Mapped[dict] = mapped_column(JSON, default=list)
    active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
```

**Arquivo**: `agenda-assistente-facil-api/app/schemas/event_type.py`

```python
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class CustomQuestion(BaseModel):
    question: str
    type: str = "text"  # text, multiple_choice, boolean
    options: Optional[List[str]] = None
    required: bool = False


class EventTypeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    duration_minutes: int = Field(default=30, gt=0)
    price: Optional[float] = Field(None, ge=0)
    location_type: str = Field(default="in_person")
    location_details: Optional[str] = None
    custom_questions: List[CustomQuestion] = Field(default_factory=list)


class EventTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, gt=0)
    price: Optional[float] = Field(None, ge=0)
    location_type: Optional[str] = None
    location_details: Optional[str] = None
    custom_questions: Optional[List[CustomQuestion]] = None
    active: Optional[bool] = None


class EventTypeOut(BaseModel):
    id: UUID
    professional_id: UUID
    name: str
    description: Optional[str]
    duration_minutes: int
    price: Optional[float]
    location_type: str
    location_details: Optional[str]
    custom_questions: List[CustomQuestion]
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True
```

**Arquivo**: `agenda-assistente-facil-api/app/api/routes/event_types.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.api.deps import get_current_user, get_db_session, require_role, subject_uuid
from app.models.entities import EventType, UserRole
from app.schemas.event_type import EventTypeCreate, EventTypeUpdate, EventTypeOut

router = APIRouter(prefix="/event-types", tags=["event-types"])


@router.post("", response_model=EventTypeOut, status_code=201)
async def create_event_type(
    payload: EventTypeCreate,
    session: Session = Depends(get_db_session),
    current_user=Depends(require_role(UserRole.PROVIDER)),
):
    professional_id = subject_uuid(current_user)
    
    event_type = EventType(
        professional_id=professional_id,
        **payload.model_dump(),
    )
    
    session.add(event_type)
    session.commit()
    session.refresh(event_type)
    
    return EventTypeOut.model_validate(event_type, from_attributes=True)


@router.get("", response_model=list[EventTypeOut])
async def list_event_types(
    active_only: bool = True,
    session: Session = Depends(get_db_session),
    current_user=Depends(require_role(UserRole.PROVIDER)),
):
    professional_id = subject_uuid(current_user)
    
    query = session.query(EventType).filter(
        EventType.professional_id == professional_id
    )
    
    if active_only:
        query = query.filter(EventType.active == True)
    
    items = query.all()
    return [EventTypeOut.model_validate(x, from_attributes=True) for x in items]


@router.get("/{event_type_id}", response_model=EventTypeOut)
async def get_event_type(
    event_type_id: UUID,
    session: Session = Depends(get_db_session),
    current_user=Depends(require_role(UserRole.PROVIDER)),
):
    professional_id = subject_uuid(current_user)
    
    event_type = session.query(EventType).filter(
        EventType.id == event_type_id,
        EventType.professional_id == professional_id,
    ).first()
    
    if not event_type:
        raise HTTPException(status_code=404, detail="Tipo de evento não encontrado.")
    
    return EventTypeOut.model_validate(event_type, from_attributes=True)


@router.put("/{event_type_id}", response_model=EventTypeOut)
async def update_event_type(
    event_type_id: UUID,
    payload: EventTypeUpdate,
    session: Session = Depends(get_db_session),
    current_user=Depends(require_role(UserRole.PROVIDER)),
):
    professional_id = subject_uuid(current_user)
    
    event_type = session.query(EventType).filter(
        EventType.id == event_type_id,
        EventType.professional_id == professional_id,
    ).first()
    
    if not event_type:
        raise HTTPException(status_code=404, detail="Tipo de evento não encontrado.")
    
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event_type, field, value)
    
    session.commit()
    session.refresh(event_type)
    
    return EventTypeOut.model_validate(event_type, from_attributes=True)


@router.delete("/{event_type_id}", status_code=204)
async def delete_event_type(
    event_type_id: UUID,
    session: Session = Depends(get_db_session),
    current_user=Depends(require_role(UserRole.PROVIDER)),
):
    professional_id = subject_uuid(current_user)
    
    event_type = session.query(EventType).filter(
        EventType.id == event_type_id,
        EventType.professional_id == professional_id,
    ).first()
    
    if not event_type:
        raise HTTPException(status_code=404, detail="Tipo de evento não encontrado.")
    
    # Soft delete
    event_type.active = False
    session.commit()
    
    return None
```

---

## 3️⃣ Sistema de E-mails Automatizados

**Arquivo**: `agenda-assistente-facil-api/app/services/email_service.py`

```python
from typing import Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

from app.core.config import settings


class EmailService:
    """Serviço de envio de e-mails transacionais"""
    
    @staticmethod
    async def send_confirmation_email(
        to_email: str,
        patient_name: str,
        appointment_date: datetime,
        professional_name: str,
        location: Optional[str] = None,
        meeting_link: Optional[str] = None,
    ):
        """Envia e-mail de confirmação de agendamento"""
        
        subject = f"✅ Consulta Confirmada - {appointment_date.strftime('%d/%m/%Y')}"
        
        body = f"""
        Olá {patient_name},
        
        Sua consulta foi confirmada com sucesso!
        
        📅 DATA: {appointment_date.strftime('%d/%m/%Y')}
        ⏰ HORÁRIO: {appointment_date.strftime('%H:%M')}
        👨‍⚕️ PROFISSIONAL: {professional_name}
        {'📍 LOCAL: ' + location if location else ''}
        {'💻 LINK DA REUNIÃO: ' + meeting_link if meeting_link else ''}
        
        Precisa cancelar ou reagendar?
        Acesse seu painel ou entre em contato conosco.
        
        Atenciosamente,
        Equipe Agenda Assistente Fácil
        """
        
        await EmailService._send_email(to_email, subject, body)
    
    @staticmethod
    async def send_reminder_email(
        to_email: str,
        patient_name: str,
        appointment_date: datetime,
        professional_name: str,
        hours_before: int = 24,
    ):
        """Envia lembrete de consulta"""
        
        subject = f"⏰ Lembrete: Consulta em {hours_before}h"
        
        body = f"""
        Olá {patient_name},
        
        Este é um lembrete da sua consulta agendada:
        
        📅 DATA: {appointment_date.strftime('%d/%m/%Y')}
        ⏰ HORÁRIO: {appointment_date.strftime('%H:%M')}
        👨‍⚕️ PROFISSIONAL: {professional_name}
        
        Chegue com 10 minutos de antecedência.
        
        Até logo!
        """
        
        await EmailService._send_email(to_email, subject, body)
    
    @staticmethod
    async def _send_email(to_email: str, subject: str, body: str):
        """Método interno de envio"""
        
        if not settings.SMTP_HOST:
            print(f"[EMAIL MOCK] Para: {to_email}")
            print(f"[EMAIL MOCK] Assunto: {subject}")
            print(f"[EMAIL MOCK] Corpo:\n{body}")
            return
        
        msg = MIMEMultipart()
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to_email
        msg["Subject"] = subject
        
        msg.attach(MIMEText(body, "plain", "utf-8"))
        
        try:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            print(f"E-mail enviado para {to_email}")
        except Exception as e:
            print(f"Erro ao enviar e-mail: {e}")
            raise


# Instância singleton
email_service = EmailService()
```

**Arquivo**: `agenda-assistente-facil-api/app/core/config.py` (adicionar)

```python
# Configurações de e-mail
SMTP_HOST: str = os.getenv("SMTP_HOST", "")  # ex: smtp.gmail.com
SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER: str = os.getenv("SMTP_USER", "")
SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM: str = os.getenv("SMTP_FROM", "noreply@agendaassistente.com.br")
```

---

## 4️⃣ Migração de Banco de Dados

**Arquivo**: `agenda-assistente-facil-api/alembic/versions/xxxx_add_event_type_table.py`

```python
"""add event type table

Revision ID: abc123
Revises: xyz789
Create Date: 2024-12-01 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'abc123'
down_revision = 'xyz789'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('eventtype',
        sa.Column('id', sa.Uuid(as_uuid=True), nullable=False),
        sa.Column('professional_id', sa.Uuid(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, default=30),
        sa.Column('price', sa.Float(), nullable=True),
        sa.Column('location_type', sa.String(length=50), nullable=False, default='in_person'),
        sa.Column('location_details', sa.String(length=500), nullable=True),
        sa.Column('custom_questions', postgresql.JSON(astext_type=sa.Text()), nullable=False, default=list),
        sa.Column('active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_eventtype_professional_id'), 'eventtype', ['professional_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_eventtype_professional_id'), table_name='eventtype')
    op.drop_table('eventtype')
```

---

## 5️⃣ Estilos CSS para Página Pública

**Arquivo**: `agenda-assistente-facil-web/src/styles.css` (adicionar)

```css
/* Página Pública de Agendamento */
.public-booking-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.booking-header {
  text-align: center;
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid #e0e0e0;
}

.booking-header h1 {
  color: #1a1a1a;
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.professional-name {
  color: #666;
  font-size: 1.1rem;
}

.booking-content {
  display: grid;
  gap: 2rem;
}

.time-selection h2,
.booking-form h2 {
  color: #333;
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
}

.time-slot {
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.time-slot:hover {
  border-color: #4f46e5;
  background: #f0f0ff;
}

.time-slot.selected {
  border-color: #4f46e5;
  background: #4f46e5;
  color: white;
}

.no-slots {
  color: #666;
  font-style: italic;
  padding: 2rem;
  text-align: center;
  background: #f9f9f9;
  border-radius: 8px;
}

.booking-form {
  background: #f9f9f9;
  padding: 2rem;
  border-radius: 12px;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #4f46e5;
}

.form-summary {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.form-summary h3 {
  margin-bottom: 0.75rem;
  color: #333;
}

.btn-confirm {
  width: 100%;
  padding: 1rem;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-confirm:hover {
  background: #4338ca;
}

.btn-confirm:disabled {
  background: #a5a5a5;
  cursor: not-allowed;
}

.success-message,
.error-message {
  text-align: center;
  padding: 3rem;
  background: #f0fdf4;
  border-radius: 12px;
  border: 2px solid #86efac;
}

.error-message {
  background: #fef2f2;
  border-color: #fca5a5;
}

.loading {
  text-align: center;
  padding: 4rem;
  font-size: 1.2rem;
  color: #666;
}

.error {
  text-align: center;
  padding: 4rem;
  background: #fef2f2;
  border-radius: 12px;
}

/* Responsividade */
@media (max-width: 640px) {
  .public-booking-page {
    padding: 1rem;
  }
  
  .slots-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
  
  .booking-form {
    padding: 1.5rem;
  }
}
```

---

## 📋 Checklist de Implementação

### Fase 1: Página Pública ✅
- [ ] Criar endpoint `GET /public/{slug}`
- [ ] Criar endpoint `GET /public/{slug}/availability`
- [ ] Criar endpoint `POST /public/{slug}/book`
- [ ] Criar componente React `PublicBookingPage`
- [ ] Adicionar rotas no React Router
- [ ] Testar fluxo completo sem login

### Fase 2: Tipos de Evento ✅
- [ ] Criar modelo `EventType` no banco
- [ ] Gerar migration Alembic
- [ ] Criar schemas Pydantic
- [ ] Implementar CRUD de event types
- [ ] Integrar com cálculo de disponibilidade
- [ ] UI para configuração no dashboard do profissional

### Fase 3: E-mails Automáticos ✅
- [ ] Configurar serviço SMTP
- [ ] Implementar template de confirmação
- [ ] Implementar lembretes (24h, 1h antes)
- [ ] Trigger automático após agendamento
- [ ] Job agendado para lembretes

### Fase 4: Refinamentos ⬜
- [ ] Timezone detection no frontend
- [ ] Links mágicos de cancelamento/reagendamento
- [ ] Webhooks para integrações
- [ ] Analytics de agendamentos
- [ ] Embed widget para sites externos

---

## 🔗 Referências Úteis

- [Calendly API Documentation](https://developer.calendly.com/)
- [FastAPI Best Practices](https://fastapi.tiangolo.com/)
- [React Router v6](https://reactrouter.com/)
- [SendGrid Email API](https://sendgrid.com/)
- [Google Calendar API](https://developers.google.com/calendar)

---

**Próximos passos sugeridos:**
1. Implementar página pública primeiro (maior impacto)
2. Adicionar tipos de evento
3. Configurar e-mails transacionais
4. Coletar feedback dos usuários
5. Iterar sobre melhorias

Boa implementação! 🚀
