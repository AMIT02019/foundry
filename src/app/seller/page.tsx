"use client";

import { useState } from "react";
import { Reveal } from "@/components/Reveal";

export default function SellerPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    platform: "wordpress",
    portfolioUrl: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="seller-page">
      {/* Header section */}
      <section className="seller-hero">
        <div className="wrap">
          <Reveal>
            <p className="eyebrow mono" style={{ color: "var(--cobalt-lift)" }}>
              The Foundry Creator Program
            </p>
            <h1 className="seller-hero__title">
              Sell your work on the developer-first marketplace.
            </h1>
            <p className="seller-hero__lede">
              Keep 70–80% of every sale. Built-in WordPress update feeds,
              automated licence enforcement, instant checkout, and zero egress fees.
            </p>
            <div className="seller-hero__actions">
              <a href="#apply" className="btn btn--lg">
                Apply as a Creator
              </a>
              <a href="/#catalogue" className="btn btn--lg btn--wire">
                Explore Catalogue
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="seller-pillars">
        <div className="wrap">
          <div className="seller-pillars__head">
            <Reveal>
              <p className="eyebrow mono">Why creators choose Foundry</p>
              <h2>Everything you need to distribute digital templates.</h2>
            </Reveal>
          </div>

          <div className="seller-grid">
            <Reveal delay={50}>
              <div className="seller-card">
                <span className="seller-card__badge mono">01 / Economics</span>
                <h3>Keep 70–80% of Every Sale</h3>
                <p>
                  Transparent fee structure without hidden tiered penalty
                  charges. Your split is frozen in database records at the moment of
                  purchase for full auditable security.
                </p>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="seller-card">
                <span className="seller-card__badge mono">02 / Automated</span>
                <h3>License Keys & Auto-Updates</h3>
                <p>
                  Drop our plug-and-play WordPress updater client into your theme.
                  Buyers activate their key on their site and receive one-click updates
                  straight from their WP Dashboard.
                </p>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="seller-card">
                <span className="seller-card__badge mono">03 / Universal</span>
                <h3>6 Platforms in One Storefront</h3>
                <p>
                  Sell WordPress themes, HTML / Tailwind kits, Shopify
                  storefronts, Framer remix links, Webflow cloneables, and Figma
                  design systems side by side.
                </p>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="seller-card">
                <span className="seller-card__badge mono">04 / Storage</span>
                <h3>Zero Egress File Hosting</h3>
                <p>
                  High-speed global distribution powered by Cloudflare R2.
                  Buyers get temporary signed download grants that expire in 15 minutes,
                  protecting your digital assets.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="seller-workflow">
        <div className="wrap">
          <Reveal>
            <div className="seller-workflow__inner">
              <div className="seller-workflow__text">
                <p className="eyebrow mono">The Creator Workflow</p>
                <h2>From repository to customer in three steps.</h2>
                <div className="steps-list">
                  <div className="step-item">
                    <span className="step-num mono">1</span>
                    <div>
                      <strong>Package your template</strong>
                      <p>
                        Zip your WordPress theme or HTML kit, or provide your Framer
                        remix / Webflow clone link.
                      </p>
                    </div>
                  </div>
                  <div className="step-item">
                    <span className="step-num mono">2</span>
                    <div>
                      <strong>Publish to the catalogue</strong>
                      <p>
                        Set your regular & extended pricing, attach requirements (e.g. PHP 8.1+, WP 6.4+),
                        and link your live interactive preview demo.
                      </p>
                    </div>
                  </div>
                  <div className="step-item">
                    <span className="step-num mono">3</span>
                    <div>
                      <strong>Get paid automatically</strong>
                      <p>
                        Payments are captured instantly, licences are issued immediately,
                        and your earnings accrue directly to your seller balance.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Application Form */}
      <section className="seller-apply" id="apply">
        <div className="wrap">
          <div className="seller-apply__box">
            <Reveal>
              <div className="seller-apply__head">
                <p className="eyebrow mono">Join the creator roster</p>
                <h2>Start selling your templates</h2>
                <p className="seller-apply__sub">
                  We review every submission for code quality, design fidelity, and documentation.
                </p>
              </div>

              {submitted ? (
                <div className="seller-success">
                  <h3>Application received!</h3>
                  <p>
                    Thank you for applying to sell on Foundry. Our curation team will review
                    your portfolio and reach out to <strong>{form.email}</strong> within 24 hours.
                  </p>
                  <a href="/#catalogue" className="btn btn--block" style={{ marginTop: "1.5rem" }}>
                    Back to Catalogue
                  </a>
                </div>
              ) : (
                <form className="seller-form" onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="seller-name">Your name or studio</label>
                    <input
                      id="seller-name"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Studio Mono"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="seller-email">Email address</label>
                    <input
                      id="seller-email"
                      type="email"
                      className="form-input"
                      placeholder="you@example.com"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="seller-platform">Primary platform</label>
                    <select
                      id="seller-platform"
                      className="form-input"
                      value={form.platform}
                      onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    >
                      <option value="wordpress">WordPress Themes</option>
                      <option value="html">HTML & Tailwind Kits</option>
                      <option value="shopify">Shopify Storefronts</option>
                      <option value="framer">Framer Templates</option>
                      <option value="webflow">Webflow Templates</option>
                      <option value="figma">Figma UI Kits</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="seller-url">Portfolio or demo link</label>
                    <input
                      id="seller-url"
                      type="url"
                      className="form-input"
                      placeholder="https://yourportfolio.com"
                      required
                      value={form.portfolioUrl}
                      onChange={(e) =>
                        setForm({ ...form, portfolioUrl: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="seller-notes">About your work (optional)</label>
                    <textarea
                      id="seller-notes"
                      className="form-input form-textarea"
                      rows={3}
                      placeholder="Tell us about the templates you create..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>

                  <button type="submit" className="btn btn--block btn--lg">
                    Submit Creator Application
                  </button>
                </form>
              )}
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
