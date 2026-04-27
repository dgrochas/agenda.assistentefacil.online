"""initial schema

Revision ID: 20260426_01
Revises:
Create Date: 2026-04-26 19:30:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260426_01"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "userpatient",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("phone_number", sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_userpatient_email"), "userpatient", ["email"], unique=False)

    op.create_table(
        "userprofessional",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("oauth_provider", sa.String(length=50), nullable=True),
        sa.Column("refresh_token_encrypted", sa.String(length=4096), nullable=True),
        sa.Column("slug_url", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("slug_url"),
    )
    op.create_index(op.f("ix_userprofessional_email"), "userprofessional", ["email"], unique=False)
    op.create_index(op.f("ix_userprofessional_slug_url"), "userprofessional", ["slug_url"], unique=False)

    op.create_table(
        "appointment",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("professional_id", sa.Uuid(), nullable=False),
        sa.Column("patient_id", sa.Uuid(), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "status",
            sa.Enum("SCHEDULED", "CANCELED", "COMPLETED", name="appointmentstatus"),
            nullable=False,
        ),
        sa.Column("external_event_id", sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(["patient_id"], ["userpatient.id"]),
        sa.ForeignKeyConstraint(["professional_id"], ["userprofessional.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_appointment_patient_id"), "appointment", ["patient_id"], unique=False)
    op.create_index(op.f("ix_appointment_professional_id"), "appointment", ["professional_id"], unique=False)

    op.create_table(
        "configagenda",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("professional_id", sa.Uuid(), nullable=False),
        sa.Column("work_hours", sa.JSON(), nullable=False),
        sa.Column("slot_duration", sa.Integer(), nullable=False),
        sa.Column("buffer_time", sa.Integer(), nullable=False),
        sa.Column("cancellation_deadline_hours", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["professional_id"], ["userprofessional.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("professional_id"),
    )
    op.create_index(op.f("ix_configagenda_professional_id"), "configagenda", ["professional_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_configagenda_professional_id"), table_name="configagenda")
    op.drop_table("configagenda")

    op.drop_index(op.f("ix_appointment_professional_id"), table_name="appointment")
    op.drop_index(op.f("ix_appointment_patient_id"), table_name="appointment")
    op.drop_table("appointment")

    op.drop_index(op.f("ix_userprofessional_slug_url"), table_name="userprofessional")
    op.drop_index(op.f("ix_userprofessional_email"), table_name="userprofessional")
    op.drop_table("userprofessional")

    op.drop_index(op.f("ix_userpatient_email"), table_name="userpatient")
    op.drop_table("userpatient")
