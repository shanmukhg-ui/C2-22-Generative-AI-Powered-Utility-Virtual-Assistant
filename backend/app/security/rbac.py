from enum import Enum
from typing import List
from fastapi import HTTPException, status

class UserRole(str, Enum):
    CUSTOMER = "Customer"
    EMPLOYEE = "Employee"
    ADMINISTRATOR = "Administrator"

class RBACManager:
    @staticmethod
    def enforce_role(user_role: str, allowed_roles: List[UserRole]):
        allowed_str = [r.value for r in allowed_roles]
        if user_role not in allowed_str:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied by RBAC policy. Role '{user_role}' is not authorized. Required: {allowed_str}"
            )

    @staticmethod
    def validate_customer_ownership(caller_id: str, caller_role: str, target_customer_id: str):
        if caller_role == UserRole.CUSTOMER.value and caller_id != target_customer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"RBAC Security Violation: Citizen account '{caller_id}' cannot access records belonging to consumer '{target_customer_id}'."
            )
        return True
