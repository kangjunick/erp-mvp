from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.orders import router as orders_router
from app.routers.storage import router as storage_router


app = FastAPI(title="Viral ERP API", version="0.1.0")

# CORS: Vite(기본 5173) 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


app.include_router(orders_router)
app.include_router(storage_router)

