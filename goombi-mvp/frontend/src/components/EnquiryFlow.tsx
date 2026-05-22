import { FormEvent, useState } from "react";
import { MessageSquareText, Smartphone } from "lucide-react";

import { api } from "../services/api";
import type { Listing } from "../types/listing";

export function EnquiryFlow({ listing }: { listing: Listing }) {
  const [name, setName] = useState("");
  const [cellphone, setCellphone] = useState("");
  const [message, setMessage] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestOtp() {
    setBusy(true);
    try {
      const response = await api.requestOtp(cellphone);
      setOtpRequested(true);
      setStatus(response.message);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "OTP request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setBusy(true);
    try {
      const response = await api.verifyOtp(cellphone, otpCode);
      setOtpVerified(response.otp_verified);
      setStatus(response.message);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "OTP verification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.createEnquiry({
        listing_id: listing.id,
        name,
        cellphone,
        message,
        otp_verified: otpVerified,
      });
      setStatus("Enquiry stored. The owner handoff is still manual in this MVP.");
      setMessage("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Enquiry failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-3 border-t border-slate-200 pt-4" onSubmit={submit}>
      <h3 className="inline-flex items-center gap-2 text-base font-semibold text-slate-950">
        <MessageSquareText className="h-4 w-4" /> Enquire
      </h3>
      <label className="label">Name<input className="field" required value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="label">Cellphone<input className="field" required value={cellphone} onChange={(event) => setCellphone(event.target.value)} /></label>
      <label className="label">Message<textarea className="field min-h-24" required value={message} onChange={(event) => setMessage(event.target.value)} /></label>
      <div className="grid gap-2 rounded-md bg-slate-100 p-3">
        <div className="flex flex-wrap items-end gap-2">
          <button className="secondary-button" disabled={busy || cellphone.length < 7} type="button" onClick={requestOtp}>
            <Smartphone className="h-4 w-4" /> Request OTP
          </button>
          {otpRequested && (
            <>
              <input className="field w-28" placeholder="1234" value={otpCode} onChange={(event) => setOtpCode(event.target.value)} />
              <button className="secondary-button" disabled={busy || otpCode.length < 4} type="button" onClick={verifyOtp}>Verify</button>
            </>
          )}
        </div>
        <p className="text-xs text-slate-600">Placeholder OTP only. No telco API is connected.</p>
      </div>
      <button className="primary-button" disabled={busy || !otpVerified} type="submit">Submit enquiry</button>
      {status && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-950">{status}</p>}
    </form>
  );
}
