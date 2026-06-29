import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Upload, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import GlassCard from "@/components/GlassCard";

export const Route = createFileRoute("/_authenticated/complete-profile")({
  head: () => ({ meta: [{ title: "Complete Profile — OrionAI" }] }),
  component: CompleteProfile,
});

const ROLES = ["Frontend Engineer", "Backend Engineer", "Full-Stack Engineer", "Data Scientist", "Product Manager", "DevOps", "Mobile Engineer", "ML Engineer"];
const LEVELS = ["Intern", "Junior (0-2 yrs)", "Mid (2-5 yrs)", "Senior (5-8 yrs)", "Staff+ (8+ yrs)"];

function CompleteProfile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [dob, setDob] = useState(user?.dob || "");
  const [userType, setUserType] = useState<"student" | "professional" | "">(user?.userType || "");
  const [university, setUniversity] = useState(user?.university || "");
  const [yearsOfExperience, setYearsOfExperience] = useState(user?.yearsOfExperience || "");
  const [targetRole, setTargetRole] = useState(user?.targetRole || ROLES[0]);
  const [experienceLevel, setExperienceLevel] = useState(user?.experienceLevel || LEVELS[1]);
  const [resume, setResume] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync experience level based on years of experience for professionals
  useEffect(() => {
    if (userType === "professional" && yearsOfExperience) {
      const years = parseInt(yearsOfExperience);
      if (isNaN(years)) return;
      if (years < 2) setExperienceLevel(LEVELS[1]); // Junior
      else if (years < 5) setExperienceLevel(LEVELS[2]); // Mid
      else if (years < 8) setExperienceLevel(LEVELS[3]); // Senior
      else setExperienceLevel(LEVELS[4]); // Staff+
    } else if (userType === "student") {
      setExperienceLevel(LEVELS[0]); // Intern
    }
  }, [yearsOfExperience, userType]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userType) {
      toast.error("Please select if you are a Student or a Working Professional");
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("name", fullName);
      form.append("fullName", fullName);
      form.append("targetRole", targetRole);
      form.append("experienceLevel", experienceLevel);
      form.append("dob", dob);
      form.append("userType", userType);
      form.append("university", userType === "student" ? university : "");
      form.append("yearsOfExperience", userType === "professional" ? yearsOfExperience : "");
      if (resume) form.append("resume", resume);

      const { data } = await api.post("/profile", form, { 
        headers: { "Content-Type": "multipart/form-data" } 
      });

      updateUser({ 
        fullName, 
        targetRole, 
        experienceLevel, 
        dob,
        userType,
        university: userType === "student" ? university : undefined,
        yearsOfExperience: userType === "professional" ? yearsOfExperience : undefined,
        resumePath: data.user?.resumePath,
        profileComplete: true 
      });

      toast.success("Profile saved");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <GlassCard strong className="p-8">
        <h1 className="text-2xl font-bold">Complete your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">We tailor questions to your role and experience.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required
              className="glass w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50" />
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Date of Birth</label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required
              className="glass w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 text-muted-foreground focus:text-foreground" />
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Profile Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUserType("student")}
                className={`glass flex items-center justify-center rounded-xl py-3 text-sm font-medium transition-all cursor-pointer ${
                  userType === "student" ? "border-primary text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setUserType("professional")}
                className={`glass flex items-center justify-center rounded-xl py-3 text-sm font-medium transition-all cursor-pointer ${
                  userType === "professional" ? "border-primary text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Working Professional
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {userType === "student" && (
              <motion.div
                key="student-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-3"
              >
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">University / College Name</label>
                  <input
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="e.g. Stanford University"
                    required
                    className="glass w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50"
                  />
                </div>
              </motion.div>
            )}

            {userType === "professional" && (
              <motion.div
                key="professional-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-3"
              >
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Years of Experience</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(e.target.value)}
                    placeholder="e.g. 3"
                    required
                    className="glass w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Target job role</label>
            <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)}
              className="glass w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50">
              {ROLES.map((r) => <option key={r} value={r} className="bg-background text-foreground">{r}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Resume (optional)</label>
            <label className="glass flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-6 text-sm text-muted-foreground hover:bg-white/5 border border-dashed border-white/10">
              <Upload className="h-4 w-4" />
              {resume ? resume.name : "Upload PDF or DOCX"}
              <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                onChange={(e) => setResume(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          <button disabled={loading}
            className="gradient-bg flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-white glow disabled:opacity-60 cursor-pointer">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Save profile
          </button>
        </form>
      </GlassCard>
    </div>
  );
}

export default CompleteProfile;