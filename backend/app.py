from datetime import date
import sqlite3
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

DB_PATH = Path(__file__).with_name("stock.db")

app = FastAPI(title="Mates x Vos Stock API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProductIn(BaseModel):
    name: str
    brand: str
    cost: float = Field(gt=0)
    price: float = Field(gt=0)
    stock: int = Field(ge=0)
    min_stock: int = Field(ge=0)


class PurchaseIn(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    unit_cost: float = Field(gt=0)
    date: date


class SaleIn(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    seller: str
    payment: str
    date: date


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def rows(cursor):
    return [dict(row) for row in cursor.fetchall()]


@app.on_event("startup")
def startup():
    with db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                brand TEXT NOT NULL,
                cost REAL NOT NULL,
                price REAL NOT NULL,
                stock INTEGER NOT NULL,
                min_stock INTEGER NOT NULL,
                sold INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                detail TEXT NOT NULL,
                amount REAL NOT NULL DEFAULT 0,
                profit REAL NOT NULL DEFAULT 0,
                date TEXT NOT NULL,
                seller TEXT,
                payment TEXT
            );
            """
        )
        count = conn.execute("SELECT COUNT(*) AS count FROM products").fetchone()["count"]
        if count == 0:
            seed = [
                ("Baldo 1kg", "Baldo", 12000, 17000, 34, 8, 42),
                ("Canarias Serena 1kg", "Canarias", 10800, 15800, 18, 10, 31),
                ("Playadito 1kg", "Playadito", 7200, 11200, 46, 12, 55),
            ]
            conn.executemany(
                "INSERT INTO products (name, brand, cost, price, stock, min_stock, sold) VALUES (?, ?, ?, ?, ?, ?, ?)",
                seed,
            )
            conn.execute(
                "INSERT INTO movements (type, title, detail, amount, profit, date, seller, payment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                ("venta", "Venta registrada", "3 Baldo 1kg por Mercado Pago", 51000, 15000, str(date.today()), "Juli", "Mercado Pago"),
            )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/products")
def list_products():
    with db() as conn:
        return rows(conn.execute("SELECT * FROM products ORDER BY id DESC"))


@app.post("/products")
def create_product(product: ProductIn):
    with db() as conn:
        cursor = conn.execute(
            "INSERT INTO products (name, brand, cost, price, stock, min_stock) VALUES (?, ?, ?, ?, ?, ?)",
            (product.name, product.brand, product.cost, product.price, product.stock, product.min_stock),
        )
        conn.execute(
            "INSERT INTO movements (type, title, detail, date) VALUES (?, ?, ?, ?)",
            ("producto", "Producto creado", f"{product.name} quedó disponible con {product.stock} unidades", str(date.today())),
        )
        return {"id": cursor.lastrowid, **product.model_dump()}


@app.post("/purchases")
def register_purchase(purchase: PurchaseIn):
    with db() as conn:
        product = conn.execute("SELECT * FROM products WHERE id = ?", (purchase.product_id,)).fetchone()
        if product is None:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        amount = purchase.quantity * purchase.unit_cost
        conn.execute(
            "UPDATE products SET stock = stock + ?, cost = ? WHERE id = ?",
            (purchase.quantity, purchase.unit_cost, purchase.product_id),
        )
        conn.execute(
            "INSERT INTO movements (type, title, detail, amount, date) VALUES (?, ?, ?, ?, ?)",
            ("compra", "Compra registrada", f"{purchase.quantity} {product['name']} ingresaron al stock", amount, str(purchase.date)),
        )
        return {"ok": True, "amount": amount}


@app.post("/sales")
def register_sale(sale: SaleIn):
    with db() as conn:
        product = conn.execute("SELECT * FROM products WHERE id = ?", (sale.product_id,)).fetchone()
        if product is None:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        if product["stock"] < sale.quantity:
            raise HTTPException(status_code=409, detail="Stock insuficiente")
        amount = product["price"] * sale.quantity
        profit = (product["price"] - product["cost"]) * sale.quantity
        conn.execute(
            "UPDATE products SET stock = stock - ?, sold = sold + ? WHERE id = ?",
            (sale.quantity, sale.quantity, sale.product_id),
        )
        conn.execute(
            "INSERT INTO movements (type, title, detail, amount, profit, date, seller, payment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            ("venta", "Venta registrada", f"{sale.quantity} {product['name']} por {sale.payment}", amount, profit, str(sale.date), sale.seller, sale.payment),
        )
        return {"ok": True, "amount": amount, "profit": profit}


@app.get("/movements")
def list_movements(kind: Literal["todos", "compra", "venta", "stock", "producto"] = "todos"):
    query = "SELECT * FROM movements"
    params = ()
    if kind != "todos":
        query += " WHERE type = ?"
        params = (kind,)
    query += " ORDER BY id DESC"
    with db() as conn:
        return rows(conn.execute(query, params))


@app.get("/stats")
def stats():
    with db() as conn:
        products = rows(conn.execute("SELECT * FROM products"))
        movements = rows(conn.execute("SELECT * FROM movements"))
    sales = sum(m["amount"] for m in movements if m["type"] == "venta")
    profit = sum(m["profit"] for m in movements if m["type"] == "venta")
    stock = sum(p["stock"] for p in products)
    low_stock = [p for p in products if p["stock"] <= p["min_stock"]]
    top = max(products, key=lambda p: p["sold"], default=None)
    return {
        "sales": sales,
        "profit": profit,
        "stock": stock,
        "low_stock": low_stock,
        "top_product": top,
    }
