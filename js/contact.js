// Public contact form. Inserts directly into contact_messages as the anon
// role (allowed by the "anon can send contact message" RLS policy in
// 0003_static_client_policies.sql). Spam protection: honeypot field + a
// minimum fill-time check. Validation mirrors the DB CHECK constraints.
import { getClient, isConfigured } from "./supabaseClient.js";

const $ = (id) => document.getElementById(id);

export function initContactForm(contact) {
  const form = $("contact-form");
  if (!form) return;
  const startedAt = Date.now();
  const feedback = $("cf-feedback");
  const submit = $("cf-submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    feedback.textContent = "";
    feedback.className = "form-msg";

    const name = $("cf-name").value.trim();
    const email = $("cf-email").value.trim();
    const subject = $("cf-subject").value.trim();
    const message = $("cf-message").value.trim();
    const honeypot = $("cf-website").value;

    // Client-side validation
    if (name.length < 1 || name.length > 120) return fail("Please enter your name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Please enter a valid email.");
    if (message.length < 10) return fail("Your message is too short.");

    // Spam: honeypot filled, or submitted suspiciously fast → pretend success.
    if (honeypot || Date.now() - startedAt < 3000) {
      return succeed(contact.success_message);
    }

    if (!isConfigured()) {
      return fail("The contact form isn't connected yet. Add your Supabase keys in js/config.js.");
    }

    submit.disabled = true;
    submit.textContent = "Sending…";
    try {
      const supabase = getClient();
      const { error } = await supabase.from("contact_messages").insert({
        name, email, subject, message, is_read: false, is_archived: false,
      });
      if (error) throw error;
      form.reset();
      succeed(contact.success_message);
    } catch (err) {
      console.error(err);
      fail(contact.error_message || "Something went wrong. Please try again.");
    } finally {
      submit.disabled = false;
      submit.textContent = "Send Message";
    }
  });

  function fail(msg) {
    feedback.textContent = msg;
    feedback.className = "form-msg err";
  }
  function succeed(msg) {
    feedback.textContent = msg || "Thanks! Your message has been sent.";
    feedback.className = "form-msg ok";
  }
}
