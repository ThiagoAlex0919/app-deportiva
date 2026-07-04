"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiRequestError, iniciarSesion, registrar } from "@/lib/api";

/**
 * Formulario compartido de login/registro.
 * El submit usa variant `primary` (blanco): entrar no es una acción
 * económica — el acento ticket se reserva a Tickets/CTAs de recompensa.
 */
export function AuthForm({ modo }: { modo: "login" | "registro" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      if (modo === "registro") {
        await registrar({ email, password, nombre: nombre || undefined });
        toast.success("¡Cuenta creada! Recibiste 500 Tickets de bienvenida.");
      } else {
        await iniciarSesion({ email, password });
      }
      router.push("/billetera");
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError ? err.error.mensaje : "Error inesperado",
      );
      setEnviando(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full flex-col gap-3 pt-6 lg:mx-auto lg:max-w-md lg:pt-16"
    >
      <h1 className="pb-2 text-2xl font-bold">
        {modo === "login" ? "Inicia sesión" : "Crea tu cuenta"}
      </h1>

      {modo === "registro" && (
        <Input
          placeholder="Nombre (opcional)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoComplete="name"
        />
      )}
      <Input
        type="email"
        required
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <Input
        type="password"
        required
        minLength={8}
        placeholder="Contraseña (mínimo 8 caracteres)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={modo === "login" ? "current-password" : "new-password"}
      />

      <Button type="submit" variant="primary" size="lg" fullWidth disabled={enviando}>
        {enviando
          ? "Un momento…"
          : modo === "login"
            ? "Entrar"
            : "Registrarme"}
      </Button>

      <p className="pt-2 text-center text-sm text-foreground-secondary">
        {modo === "login" ? (
          <>
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="font-semibold text-foreground">
              Regístrate
            </Link>
          </>
        ) : (
          <>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-semibold text-foreground">
              Inicia sesión
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
