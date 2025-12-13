import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { addEcoPoints } from "../../utils/ecoPoints";
import { db, auth } from "../../firebase";
import { getAuth } from "firebase/auth";
import emailjs from '@emailjs/browser';

const EventRegistration = () => {
  const { id } = useParams(); // Event ID from URL
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [registrationData, setRegistrationData] = useState(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    studentId: "",
    faculty: "",
  });

  const authInstance = getAuth();
  const user = authInstance.currentUser;

  // Fetch event
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const docRef = doc(db, "events", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setEvent(docSnap.data());
        else setEvent(null);
      } catch (error) {
        console.error("Error fetching event:", error);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  // Check if user has already registered
  useEffect(() => {
    if (!user) return;

    const checkRegistration = async () => {
      try {
        const q = query(
          collection(db, "eventRegistrations"),
          where("userId", "==", user.uid),
          where("eventId", "==", id)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setHasRegistered(true);
          setRegistrationData(querySnapshot.docs[0].data()); // store the existing registration
        }
      } catch (error) {
        console.error("Error checking registration:", error);
      }
    };

    checkRegistration();
  }, [id, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (eventSubmit) => {
    eventSubmit.preventDefault();

    if (!user) {
      alert("Please log in first");
      navigate("/login");
      return;
    }

    try {
      // 1️⃣ Save registration in Firestore
      await addDoc(collection(db, "eventRegistrations"), {
        userId: user.uid,
        eventId: id,
        fullName: formData.fullName,
        email: formData.email,
        studentId: formData.studentId,
        faculty: formData.faculty,
        createdAt: serverTimestamp(),
      });

      // 2️⃣ Add EcoPoints for this event
      if (event && event.ecoPoints) {
        await addEcoPoints(user.uid, event.ecoPoints); // Call your helper
      }

      // 3️⃣ Send confirmation email
      const templateParams = {
        email: formData.email,
        event: {
          title: event.title,
          date: event.date,
          time: event.time,
          location: event.location
        },
        name: formData.fullName
      };

      await emailjs.send(
        'CAT302_ReThrive@USM',     // Service ID
        'template_gkjo3dy',        // Template ID
        templateParams,
        'CpxvKuwCITdZkZdck'       // Public Key
      );

      setSubmitted(true);

      setTimeout(() => {
        navigate("/");
      }, 1800);

    } catch (error) {
      console.error("Error saving registration or sending email:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-white">
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
            <h1 className="text-3xl font-black text-brand-darkText mt-2">{event.title}</h1>
            <p className="text-brand-darkText/70 mt-1">
              {event.date} · {event.time} · {event.location}
            </p>
          </div>

          {submitted || hasRegistered ? (
            <div className="flex flex-col items-center text-center text-brand-darkText">
              <CheckCircle size={64} className="text-brand-green mb-4" />
              <p className="text-xl font-semibold">You are in!</p>
              <p className="text-brand-darkText/70 mt-2">
                We emailed a confirmation to {submitted ? formData.email : registrationData?.email}. See you soon.
              </p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="text-sm font-semibold text-brand-darkText block mb-2" htmlFor="fullName">
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
                <label className="text-sm font-semibold text-brand-darkText block mb-2" htmlFor="email">
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
                  <label className="text-sm font-semibold text-brand-darkText block mb-2" htmlFor="studentId">
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
                  <label className="text-sm font-semibold text-brand-darkText block mb-2" htmlFor="faculty">
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