import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/session";
import { getPurchases } from "@/lib/fulfilment";
import { DownloadButton } from "@/components/DownloadButton";
import { formatPrice } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/signin?next=/account");

  const purchases = await getPurchases(userId);
  const now = new Date();

  return (
    <div className="wrap account">
      <p className="eyebrow mono">Your account</p>
      <h1>Downloads and licences</h1>

      {purchases.length === 0 ? (
        <div className="empty">
          <p>You haven&apos;t bought anything yet.</p>
          <p>
            <a className="btn" href="/#catalogue" style={{ marginTop: "1rem" }}>
              Browse the catalogue
            </a>
          </p>
        </div>
      ) : (
        <ul className="purchases">
          {purchases.map(({ license, product, order }) => {
            const supported =
              !license.supportedUntil || license.supportedUntil > now;

            return (
              <li key={license.id} className="purchase">
                <div className="purchase__main">
                  <h2>{product.title}</h2>
                  <p className="purchase__tagline">{product.tagline}</p>
                  <dl className="purchase__facts mono">
                    <div>
                      <dt>Licence</dt>
                      <dd>{license.key}</dd>
                    </div>
                    <div>
                      <dt>Tier</dt>
                      <dd>
                        {license.tier}
                        {license.maxActivations === null
                          ? " · unlimited sites"
                          : ` · ${license.maxActivations} site`}
                      </dd>
                    </div>
                    <div>
                      <dt>Paid</dt>
                      <dd>{formatPrice(order.total, order.currency)}</dd>
                    </div>
                    <div>
                      <dt>Updates</dt>
                      <dd>
                        {supported
                          ? `until ${license.supportedUntil?.toISOString().slice(0, 10) ?? "forever"}`
                          : "window ended"}
                      </dd>
                    </div>
                  </dl>
                  {!supported ? (
                    <p className="purchase__note">
                      Your update window has ended. You keep the files and can
                      re-download the last version it covered — renew to receive
                      newer releases.
                    </p>
                  ) : null}
                </div>
                <div className="purchase__action">
                  <DownloadButton licenseId={license.id} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
