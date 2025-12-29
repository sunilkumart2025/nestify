import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { User, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { OTPVerification } from '../../components/auth/OTPVerification';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  stayKey: z.string().min(1, 'StayKey is required'),
  acceptedTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the Terms of Service',
  }),
});

type SignupFormData = z.infer<typeof signupSchema>;

export function SignupTenure() {
  const [isLoading, setIsLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [formData, setFormData] = useState<SignupFormData | null>(null);
  const [adminData, setAdminData] = useState<any>(null);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onFormSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('id, hostel_name')
        .eq('stay_key', data.stayKey)
        .single();

      if (adminError || !admin) {
        throw new Error('Invalid StayKey. Please ask your hostel owner.');
      }

      setAdminData(admin);
      setFormData(data);
      setShowOTP(true);
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerified = async () => {
    if (!formData || !adminData) return;
    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: 'tenure',
            admin_id: adminData.id,
            phone: formData.phone,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Signup failed');

      if (authData.session) {
        toast.success(`Welcome to ${adminData.hostel_name}!`);
        navigate('/tenure/home');
      } else {
        toast.success('Account created! Please check your email to confirm.');
        navigate('/login');
      }
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
      setShowOTP(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (showOTP && formData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <OTPVerification
          email={formData.email}
          onVerified={handleVerified}
          onCancel={() => setShowOTP(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl">
        <div>
          <Link to="/" className="inline-flex items-center text-sm text-slate-500 hover:text-primary mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
          </Link>
          <div className="flex justify-center">
            <div className="bg-secondary p-3 rounded-xl">
              <User className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
            Student / Tenant Signup
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Join your hostel community
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onFormSubmit)}>
          <div className="space-y-4">
            <Input
              label="Full Name"
              placeholder="Jane Doe"
              {...register('fullName')}
              error={errors.fullName?.message}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="jane@example.com"
              {...register('email')}
              error={errors.email?.message}
            />

            <Input
              label="Phone Number"
              placeholder="+91 98765 43210"
              {...register('phone')}
              error={errors.phone?.message}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              error={errors.password?.message}
            />

            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <Input
                label="StayKey (Required)"
                placeholder="Enter the key from your owner"
                {...register('stayKey')}
                error={errors.stayKey?.message}
                className="bg-white"
              />
              <p className="text-xs text-purple-700 mt-2">
                This key links you to your specific hostel.
              </p>
            </div>
          </div>

          {/* Terms & Conditions Checkbox */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="terms"
                type="checkbox"
                {...register('acceptedTerms')}
                className="w-4 h-4 border border-slate-300 rounded bg-white focus:ring-2 focus:ring-secondary cursor-pointer"
              />
            </div>
            <label htmlFor="terms" className="ml-3 text-sm text-slate-600">
              I agree to the{' '}
              <Link to="/terms" target="_blank" className="font-bold text-secondary hover:underline">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link to="/privacy" target="_blank" className="font-bold text-secondary hover:underline">
                Privacy Policy
              </Link>
            </label>
          </div>
          {errors.acceptedTerms && (
            <p className="text-sm text-red-600 -mt-2">{errors.acceptedTerms.message}</p>
          )}

          <Button type="submit" className="w-full bg-secondary hover:bg-secondary-hover" isLoading={isLoading}>
            Verify & Create Account
          </Button>

          <div className="text-center text-sm">
            <span className="text-slate-600">Already have an account? </span>
            <Link to="/login" className="font-medium text-secondary hover:text-secondary-hover">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
