import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { authConfigured, currentUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const redirectTo = next ?? "/account";

  if (await currentUserId()) redirect(redirectTo);

  const devMode = process.env.FOUNDRY_DEV_LOGIN === "true";
  const configured = authConfigured();

  if (!configured) {
    return (
      <div className="wrap signin">
        <p className="eyebrow mono">Foundry</p>
        <h1>Sign in isn&apos;t configured</h1>
        <p className="signin__lede">
          This deployment has no <code>AUTH_SECRET</code> or identity provider
          set, so accounts are switched off. Everything else on the site is
          browsable.
        </p>
        <a className="btn btn--block" href="/#catalogue">
          Browse the catalogue
        </a>
      </div>
    );
  }

  return (
    <div className="wrap signin">
      <p className="eyebrow mono">Foundry</p>
      <h1>Sign in</h1>
      <p className="signin__lede">
        Your purchases, licence keys and downloads live behind this.
      </p>

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo });
        }}
      >
        <button className="btn btn--block btn--ghost" type="submit">
          Continue with Google
        </button>
      </form>

      {devMode ? (
        <form
          className="signin__dev"
          action={async (formData: FormData) => {
            "use server";
            await signIn("dev", {
              email: String(formData.get("email") ?? ""),
              redirectTo,
            });
          }}
        >
          <p className="mono signin__devnote">
            Development only — signs in as any email, no password.
          </p>
          <input
            className="signin__input"
            type="email"
            name="email"
            placeholder="buyer@example.com"
            required
          />
          <button className="btn btn--block" type="submit">
            Dev sign-in
          </button>
        </form>
      ) : null}
    </div>
  );
}
