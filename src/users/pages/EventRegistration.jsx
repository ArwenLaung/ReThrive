import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { EVENTS_DATA } from "../../../constants";

const EventRegistration = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = EVENTS_DATA.find((item) => item.id === Number(id));
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    studentId: "",
    faculty: "",
  });
  const [submitted, setSubmitted] = useState(false);

  if (!event) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-2xl font-semibold text-brand-darkText mb-6">
            We could not find that registration link.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-brand-purple font-semibold hover:text-brand-green transition-colors"
          >
            <ArrowLeft size={18} />
            Back to home
          </Link>
        </main>
      </div>
    );
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (eventSubmit) => {
    eventSubmit.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      navigate("/");
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-3xl mt-7 mx-auto px-4 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-brand-purple font-semibold hover:text-brand-green transition-colors"
        >
          <ArrowLeft size={18} />
          Back to home
        </Link>

        <section className="mt-8 bg-brand-cream rounded-3xl shadow-[0_12px_40px_rgba(124,58,237,0.08)] p-8">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-wide text-brand-darkText/60 font-semibold">
              Registration
            </p>
            <h1 className="text-3xl font-black text-brand-darkText mt-2">
              {event.title}
            </h1>
            <p className="text-brand-darkText/70 mt-1">
              {event.date} · {event.time} · {event.location}
            </p>
          </div>

          {submitted ? (
            <div className="flex flex-col items-center text-center text-brand-darkText">
              <CheckCircle size={64} className="text-brand-green mb-4" />
              <p className="text-xl font-semibold">You are in!</p>
              <p className="text-brand-darkText/70 mt-2">
                We emailed a confirmation to {formData.email}. See you soon.
              </p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  className="text-sm font-semibold text-brand-darkText block mb-2"
                  htmlFor="fullName"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="w-full rounded-2xl border border-brand-lightPurple/50 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-purple ring-offset-1"
                  placeholder="E.g. Nur Aisyah binti Hassan"
                />
              </div>

              <div>
                <label
                  className="text-sm font-semibold text-brand-darkText block mb-2"
                  htmlFor="email"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-2xl border border-brand-lightPurple/50 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-purple ring-offset-1"
                  placeholder="you@usm.my"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    className="text-sm font-semibold text-brand-darkText block mb-2"
                    htmlFor="studentId"
                  >
                    Student / Staff ID
                  </label>
                  <input
                    id="studentId"
                    name="studentId"
                    type="text"
                    value={formData.studentId}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-brand-lightPurple/50 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-purple ring-offset-1"
                    placeholder="E.g. 1234567"
                  />
                </div>
                <div>
                  <label
                    className="text-sm font-semibold text-brand-darkText block mb-2"
                    htmlFor="faculty"
                  >
                    Faculty / Society
                  </label>
                  <input
                    id="faculty"
                    name="faculty"
                    type="text"
                    value={formData.faculty}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-brand-lightPurple/50 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-purple ring-offset-1"
                    placeholder="E.g. School of HBP"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-brand-purple text-white font-semibold py-3 shadow-md hover:bg-brand-green transition-colors"
              >
                Submit registration
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
};

export default EventRegistration;
