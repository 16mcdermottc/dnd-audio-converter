from enum import Enum

class ProcessingStatus(str, Enum):
    PENDING = "pending"
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"
