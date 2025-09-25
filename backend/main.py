from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from pymongo import MongoClient
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
from dotenv import load_dotenv
import os
from bson import ObjectId
from fastapi import Path


# Load env variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

app = FastAPI()

# Enable CORS for React (5173 = Vite, 3000 = CRA)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# MongoDB connection
try:
    client = MongoClient(MONGO_URI)
    client.admin.command('ping')
    print("✅ Connected to MongoDB")

    db = client.auth_db
    users_collection = db.users
    users_collection.create_index([("email", 1)], unique=True)
except Exception as e:
    raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = users_collection.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return user

# Routes
@app.post("/api/auth/signup", response_model=Token)
async def signup(user: UserCreate):
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    users_collection.insert_one({
        "email": user.email,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow()
    })
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token": token, "token_type": "bearer"}

@app.post("/api/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = users_collection.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(data={"sub": form_data.username}, expires_delta=access_token_expires)
    return {"access_token": token, "token_type": "bearer"}

@app.get("/api/users/me")
async def read_users_me(current_user = Depends(get_current_user)):
    return {"email": current_user["email"]}



@app.get("/api/problems")
async def get_problems():
    problems = list(db.problems.find({}, {"title": 1, "difficulty": 1}))
    for p in problems:
        p["_id"] = str(p["_id"])  # convert ObjectId -> string
    return problems

@app.get("/api/problems/title/{title}")
async def get_problem_by_title(title: str):
    problem = db.problems.find_one({"title": title})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    problem["_id"] = str(problem["_id"])
    return problem

@app.get("/api/problems/id/{problem_id}")
async def get_problem_by_id(problem_id: str):
    problem = db.problems.find_one({"_id": ObjectId(problem_id)})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    problem["_id"] = str(problem["_id"])
    return problem

from rooms import router as rooms_router
from code_execution import router as code_router

app.include_router(rooms_router)
app.include_router(code_router)


from socket_server import sio
import socketio

# Wrap FastAPI with Socket.IO
sio_app = socketio.ASGIApp(sio, other_asgi_app=app)