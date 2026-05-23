# Mates x Vos Stock Premium

Sistema SaaS premium para stock, compras, ventas, ganancias e historial de yerbas.

## Desarrollo local

```bash
npm install
npm run dev
```

La app queda disponible en:

```bash
http://localhost:3000
```

En desarrollo, si no hay variables de Supabase configuradas, la app puede funcionar con datos semilla locales. En producción no usa modo local: requiere Supabase configurado.

## Supabase

1. Crear un proyecto en Supabase.
2. Abrir el SQL Editor.
3. Ejecutar completo el archivo:

```bash
supabase/schema.sql
```

4. Copiar las credenciales del proyecto:

```bash
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
APP_PASSWORD
```

La app usa API routes de Next, así que la service role key queda del lado servidor. No la publiques como `NEXT_PUBLIC_*`. `APP_PASSWORD` es la clave privada para entrar al panel.

## Vercel

1. Importar este proyecto en Vercel.
2. Configurar variables de entorno:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
APP_PASSWORD=una-clave-privada
```

3. Deploy.

Build command:

```bash
npm run build
```

Output y framework: Vercel detecta Next.js automáticamente.

Endpoint de chequeo:

```bash
/api/health
```

Debe responder:

```json
{ "status": "ok" }
```

## Backend FastAPI opcional

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

El deploy en Vercel no necesita FastAPI: las operaciones principales ya están cubiertas por API routes de Next + Supabase.
