"""add event types and update appointments

Revision ID: 20260426_02
Revises: 20260426_01
Create Date: 2026-04-26 20:00:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260426_02"
down_revision: Union[str, None] = "20260426_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create appointment_type enum
    appointment_type_enum = sa.Enum(
        "PATIENT_APPOINTMENT", "PERSONAL_BLOCK", name="appointmenttype"
    )
    appointment_type_enum.create(op.get_bind())

    # Add new columns to appointment table
    op.add_column(
        "appointment",
        sa.Column(
            "appointment_type",
            sa.Enum("PATIENT_APPOINTMENT", "PERSONAL_BLOCK", name="appointmenttype"),
            nullable=False,
            server_default="PATIENT_APPOINTMENT",
        ),
    )
    op.add_column(
        "appointment",
        sa.Column("title", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "appointment",
        sa.Column("description", sa.String(length=1024), nullable=True),
    )

    # Make patient_id nullable (for personal blocks)
    with op.batch_alter_table("appointment") as batch_op:
        batch_op.alter_column("patient_id", existing_type=sa.Uuid(), nullable=True)

    # Create eventtype table
    op.create_table(
        "eventtype",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("professional_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=1024), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("color", sa.String(length=7), nullable=True),
        sa.ForeignKeyConstraint(["professional_id"], ["userprofessional.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_eventtype_professional_id"), "eventtype", ["professional_id"], unique=False
    )


def downgrade() -> None:
    # Drop eventtype table
    op.drop_index(op.f("ix_eventtype_professional_id"), table_name="eventtype")
    op.drop_table("eventtype")

    # Remove columns from appointment table
    with op.batch_alter_table("appointment") as batch_op:
        batch_op.alter_column("patient_id", existing_type=sa.Uuid(), nullable=False)
        batch_op.drop_column("description")
        batch_op.drop_column("title")
        batch_op.drop_column("appointment_type")

    # Drop appointment_type enum
    op.execute("DROP TYPE appointmenttype")
