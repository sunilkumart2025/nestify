import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft } from 'lucide-react';
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
    hostelName: z.string().min(2, 'Hostel name is required'),
    hostelAddress: z.string().min(5, 'Hostel address is required'),
    nestKey: z.string().min(1, 'NestKey is required'),
});

type SignupFormData = z.infer<typeof signupSchema>;

export function SignupAdmin() {
    const [isLoading, setIsLoading] = useState(false);
    const [showOTP, setShowOTP] = useState(false);
    const [formData, setFormData] = useState<SignupFormData | null>(null);
    const navigate = useNavigate();

    const { register, handleSubmit, formState: { errors } } = useForm<SignupFormData>({
        resolver: zodResolver(signupSchema),
    });

    const onFormSubmit = async (data: SignupFormData) => {
        if (data.nestKey !== 'NESTIFY2025') {
            toast.error('Invalid NestKey. Please contact support.');
            return;
        }
        setFormData(data);
        setShowOTP(true);
    };

    const handleVerified = async () => {
        if (!formData) return;
        setIsLoading(true);
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        role: 'admin',
                        hostel_name: formData.hostelName,
                        hostel_address: formData.hostelAddress,
                        phone: formData.phone,
                        stay_key: Math.random().toString(36).substring(2, 8).toUpperCase(),
                    },
                },
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Signup failed');

            // Check if session exists (meaning email confirmation is disabled)
            if (authData.session) {
                toast.success('Account created! Redirecting...');
                navigate('/admin');
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
                        <div className="bg-primary p-3 rounded-xl">
                            <Building2 className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
                        Hostel Owner Signup
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-600">
                        Manage your hostel efficiently
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit(onFormSubmit)}>
                    <div className="space-y-4">
                        <Input
                            label="Full Name"
                            placeholder="John Doe"
                            {...register('fullName')}
                            error={errors.fullName?.message}
                        />

                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="john@example.com"
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
                            label="Hostel Name"
                            placeholder="Sunshine Hostel"
                            {...register('hostelName')}
                            error={errors.hostelName?.message}
                        />

                        <Input
                            label="Hostel Address"
                            placeholder="123, Main Street, City"
                            {...register('hostelAddress')}
                            error={errors.hostelAddress?.message}
                        />

                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            {...register('password')}
                            error={errors.password?.message}
                        />

                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <Input
                                label="NestKey (Required)"
                                placeholder="Enter the secret key"
                                {...register('nestKey')}
                                error={errors.nestKey?.message}
                                className="bg-white"
                            />
                            <p className="text-xs text-blue-700 mt-2">
                                This key is required to create an admin account.
                            </p>
                        </div>
                    </div>

                    <Button type="submit" className="w-full" isLoading={isLoading}>
                        Verify & Create Account
                    </Button>

                    <div className="text-center text-sm">
                        <span className="text-slate-600">Already have an account? </span>
                        <Link to="/login" className="font-medium text-primary hover:text-primary-hover">
                            Sign in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
