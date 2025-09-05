import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { SupabaseAuthService } from '../../services/auth.supabase.service';
import { PasswordStrength, RegistrationData } from '../../types/auth.types';
import { AuthError, ValidationError } from '../../types/errors';

const authService = new SupabaseAuthService();

interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  age?: string;
  weight?: string;
  height?: string;
  termsAccepted?: string;
}

export default function RegisterScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Form data
  const [formData, setFormData] = useState<RegistrationData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    age: undefined,
    weight: undefined,
    height: undefined,
    fitnessGoal: undefined,
    termsAccepted: false,
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Password strength calculator
  const passwordStrength = useMemo((): PasswordStrength => {
    const password = formData.password;
    if (!password) {
      return {
        score: 0,
        label: 'Very Weak',
        color: '#E03131',
        checks: {
          length: false,
          uppercase: false,
          lowercase: false,
          number: false,
          special: false,
        },
      };
    }

    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const score = Object.values(checks).filter(Boolean).length;
    const colors = ['#E03131', '#FFA500', '#FFA500', '#1890FF', '#00A67E'];
    const labels: PasswordStrength['label'][] = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];

    return {
      score,
      label: labels[score] || 'Very Weak',
      color: colors[score] || '#E03131',
      checks,
    };
  }, [formData.password]);

  const validateStep = (step: number): boolean => {
    const errors: ValidationErrors = {};

    if (step === 1) {
      // Personal Information
      if (!formData.firstName?.trim()) {
        errors.firstName = 'First name is required';
      }
      if (!formData.lastName?.trim()) {
        errors.lastName = 'Last name is required';
      }
      if (!formData.email?.trim()) {
        errors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Invalid email format';
      }
    } else if (step === 2) {
      // Password
      if (!formData.password) {
        errors.password = 'Password is required';
      } else if (passwordStrength.score < 3) {
        errors.password = 'Please choose a stronger password';
      }
      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    } else if (step === 3) {
      // Physical Information (optional but validate if provided)
      if (formData.age !== undefined && (formData.age < 13 || formData.age > 120)) {
        errors.age = 'Please enter a valid age (13-120)';
      }
      if (formData.weight !== undefined && (formData.weight < 20 || formData.weight > 1000)) {
        errors.weight = 'Please enter a valid weight';
      }
      if (formData.height !== undefined && (formData.height < 30 || formData.height > 300)) {
        errors.height = 'Please enter a valid height';
      }
    } else if (step === 4) {
      // Terms and Conditions
      if (!formData.termsAccepted) {
        errors.termsAccepted = 'You must accept the terms and conditions';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      } else {
        handleRegister();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setValidationErrors({});
    } else {
      navigation.goBack();
    }
  };

  const handleRegister = async () => {
    if (!validateStep(4)) return;

    setLoading(true);
    try {
      await authService.register(formData);
      Alert.alert(
        'Registration Successful!',
        'Your account has been created. Please check your email to verify your account.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login' as never),
          },
        ]
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        Alert.alert('Validation Error', error.message);
      } else if (error instanceof AuthError) {
        Alert.alert('Registration Failed', error.message);
      } else {
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof RegistrationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Personal Information</Text>
      <Text style={styles.stepDescription}>Let's start with the basics</Text>

      {/* First Name */}
      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color="#6C757D" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, validationErrors.firstName && styles.inputError]}
          placeholder="First Name"
          placeholderTextColor="#ADB5BD"
          value={formData.firstName}
          onChangeText={(text) => updateFormData('firstName', text)}
          autoCapitalize="words"
        />
      </View>
      {validationErrors.firstName && <Text style={styles.errorText}>{validationErrors.firstName}</Text>}

      {/* Last Name */}
      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color="#6C757D" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, validationErrors.lastName && styles.inputError]}
          placeholder="Last Name"
          placeholderTextColor="#ADB5BD"
          value={formData.lastName}
          onChangeText={(text) => updateFormData('lastName', text)}
          autoCapitalize="words"
        />
      </View>
      {validationErrors.lastName && <Text style={styles.errorText}>{validationErrors.lastName}</Text>}

      {/* Email */}
      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color="#6C757D" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, validationErrors.email && styles.inputError]}
          placeholder="Email"
          placeholderTextColor="#ADB5BD"
          value={formData.email}
          onChangeText={(text) => updateFormData('email', text.toLowerCase())}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      {validationErrors.email && <Text style={styles.errorText}>{validationErrors.email}</Text>}
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Create Password</Text>
      <Text style={styles.stepDescription}>Choose a strong password to secure your account</Text>

      {/* Password */}
      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#6C757D" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, validationErrors.password && styles.inputError]}
          placeholder="Password"
          placeholderTextColor="#ADB5BD"
          value={formData.password}
          onChangeText={(text) => updateFormData('password', text)}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#6C757D"
          />
        </TouchableOpacity>
      </View>
      {validationErrors.password && <Text style={styles.errorText}>{validationErrors.password}</Text>}

      {/* Password Strength Indicator */}
      {formData.password && (
        <View style={styles.passwordStrengthContainer}>
          <View style={styles.passwordStrengthHeader}>
            <Text style={styles.passwordStrengthLabel}>Password Strength: </Text>
            <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
              {passwordStrength.label}
            </Text>
          </View>
          <View style={styles.passwordStrengthBar}>
            <View
              style={[
                styles.passwordStrengthProgress,
                { width: `${(passwordStrength.score / 5) * 100}%`, backgroundColor: passwordStrength.color }
              ]}
            />
          </View>
          <View style={styles.passwordChecks}>
            {Object.entries(passwordStrength.checks).map(([key, passed]) => (
              <View key={key} style={styles.passwordCheck}>
                <Ionicons
                  name={passed ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={passed ? '#00A67E' : '#E03131'}
                />
                <Text style={[styles.passwordCheckText, { color: passed ? '#00A67E' : '#6C757D' }]}>
                  {key === 'length' && '8+ characters'}
                  {key === 'uppercase' && 'Uppercase letter'}
                  {key === 'lowercase' && 'Lowercase letter'}
                  {key === 'number' && 'Number'}
                  {key === 'special' && 'Special character'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Confirm Password */}
      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#6C757D" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, validationErrors.confirmPassword && styles.inputError]}
          placeholder="Confirm Password"
          placeholderTextColor="#ADB5BD"
          value={formData.confirmPassword}
          onChangeText={(text) => updateFormData('confirmPassword', text)}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons
            name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#6C757D"
          />
        </TouchableOpacity>
      </View>
      {validationErrors.confirmPassword && <Text style={styles.errorText}>{validationErrors.confirmPassword}</Text>}
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Physical Information</Text>
      <Text style={styles.stepDescription}>Help us personalize your experience (optional)</Text>

      {/* Age */}
      <View style={styles.inputContainer}>
        <Ionicons name="calendar-outline" size={20} color="#6C757D" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, validationErrors.age && styles.inputError]}
          placeholder="Age"
          placeholderTextColor="#ADB5BD"
          value={formData.age?.toString() || ''}
          onChangeText={(text) => updateFormData('age', text ? parseInt(text) : undefined)}
          keyboardType="numeric"
        />
      </View>
      {validationErrors.age && <Text style={styles.errorText}>{validationErrors.age}</Text>}

      {/* Weight */}
      <View style={styles.inputContainer}>
        <Ionicons name="barbell-outline" size={20} color="#6C757D" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, validationErrors.weight && styles.inputError]}
          placeholder="Weight (kg)"
          placeholderTextColor="#ADB5BD"
          value={formData.weight?.toString() || ''}
          onChangeText={(text) => updateFormData('weight', text ? parseFloat(text) : undefined)}
          keyboardType="numeric"
        />
      </View>
      {validationErrors.weight && <Text style={styles.errorText}>{validationErrors.weight}</Text>}

      {/* Height */}
      <View style={styles.inputContainer}>
        <Ionicons name="resize-outline" size={20} color="#6C757D" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, validationErrors.height && styles.inputError]}
          placeholder="Height (cm)"
          placeholderTextColor="#ADB5BD"
          value={formData.height?.toString() || ''}
          onChangeText={(text) => updateFormData('height', text ? parseFloat(text) : undefined)}
          keyboardType="numeric"
        />
      </View>
      {validationErrors.height && <Text style={styles.errorText}>{validationErrors.height}</Text>}

      {/* Fitness Goal */}
      <View style={styles.pickerContainer}>
        <Ionicons name="target-outline" size={20} color="#6C757D" style={styles.inputIcon} />
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={formData.fitnessGoal}
            onValueChange={(value) => updateFormData('fitnessGoal', value)}
            style={styles.picker}
          >
            <Picker.Item label="Select your fitness goal" value={undefined} color="#ADB5BD" />
            <Picker.Item label="Lose Weight" value="lose_weight" />
            <Picker.Item label="Gain Muscle" value="gain_muscle" />
            <Picker.Item label="Maintain Health" value="maintain_health" />
            <Picker.Item label="Increase Strength" value="increase_strength" />
            <Picker.Item label="Improve Endurance" value="improve_endurance" />
          </Picker>
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View>
      <Text style={styles.stepTitle}>Terms & Conditions</Text>
      <Text style={styles.stepDescription}>Please review and accept our terms</Text>

      <View style={styles.termsContainer}>
        <ScrollView style={styles.termsScroll} showsVerticalScrollIndicator={true}>
          <Text style={styles.termsText}>
            <Text style={styles.termsTitle}>Terms of Service{'\n\n'}</Text>
            
            By creating an account, you agree to:{'\n\n'}
            
            <Text style={styles.termsSectionTitle}>1. Account Responsibility{'\n'}</Text>
            • You are responsible for maintaining the security of your account{'\n'}
            • You must provide accurate and complete information{'\n'}
            • You must be at least 13 years old to use this service{'\n\n'}
            
            <Text style={styles.termsSectionTitle}>2. Privacy & Data{'\n'}</Text>
            • We collect and process your data according to our Privacy Policy{'\n'}
            • Your fitness data is encrypted and stored securely{'\n'}
            • You can delete your account and data at any time{'\n\n'}
            
            <Text style={styles.termsSectionTitle}>3. Health & Safety{'\n'}</Text>
            • This app provides fitness guidance, not medical advice{'\n'}
            • Consult healthcare professionals before starting any fitness program{'\n'}
            • Use the app at your own risk{'\n\n'}
            
            <Text style={styles.termsSectionTitle}>4. Acceptable Use{'\n'}</Text>
            • Use the app for personal, non-commercial purposes{'\n'}
            • Do not share inappropriate content{'\n'}
            • Respect other users in community features{'\n\n'}
          </Text>
        </ScrollView>
      </View>

      <View style={styles.termsAcceptanceContainer}>
        <Switch
          value={formData.termsAccepted}
          onValueChange={(value) => updateFormData('termsAccepted', value)}
          trackColor={{ false: '#DEE2E6', true: '#0066CC' }}
          thumbColor={formData.termsAccepted ? '#fff' : '#6C757D'}
        />
        <TouchableOpacity
          style={styles.termsTextContainer}
          onPress={() => updateFormData('termsAccepted', !formData.termsAccepted)}
        >
          <Text style={styles.termsAcceptanceText}>
            I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </TouchableOpacity>
      </View>
      {validationErrors.termsAccepted && <Text style={styles.errorText}>{validationErrors.termsAccepted}</Text>}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="fitness" size={40} color="#0066CC" />
          </View>
          <Text style={styles.title}>Join FitFlow</Text>
          <Text style={styles.subtitle}>Create your fitness journey</Text>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4].map((step) => (
            <View
              key={step}
              style={[
                styles.progressStep,
                step <= currentStep && styles.progressStepActive,
                step < currentStep && styles.progressStepCompleted,
              ]}
            >
              <Text
                style={[
                  styles.progressStepText,
                  step <= currentStep && styles.progressStepTextActive,
                ]}
              >
                {step}
              </Text>
            </View>
          ))}
          <View style={styles.progressLine} />
        </View>

        {/* Form */}
        <View style={styles.form}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={20} color="#0066CC" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nextButton, loading && styles.disabledButton]}
            onPress={handleNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {currentStep === 4 ? 'Create Account' : 'Next'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6C757D',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 50,
    position: 'relative',
  },
  progressLine: {
    position: 'absolute',
    top: '50%',
    left: 50,
    right: 50,
    height: 2,
    backgroundColor: '#DEE2E6',
    zIndex: 0,
  },
  progressStep: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#DEE2E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    zIndex: 1,
  },
  progressStepActive: {
    borderColor: '#0066CC',
  },
  progressStepCompleted: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C757D',
  },
  progressStepTextActive: {
    color: '#0066CC',
  },
  form: {
    paddingHorizontal: 30,
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 5,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 25,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 5,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#212529',
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#E03131',
  },
  eyeIcon: {
    padding: 5,
  },
  errorText: {
    fontSize: 12,
    color: '#E03131',
    marginBottom: 10,
    marginLeft: 5,
  },
  passwordStrengthContainer: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  passwordStrengthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  passwordStrengthLabel: {
    fontSize: 14,
    color: '#6C757D',
  },
  passwordStrengthText: {
    fontSize: 14,
    fontWeight: '600',
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: '#DEE2E6',
    borderRadius: 2,
    marginBottom: 12,
  },
  passwordStrengthProgress: {
    height: '100%',
    borderRadius: 2,
  },
  passwordChecks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  passwordCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  passwordCheckText: {
    fontSize: 12,
    marginLeft: 4,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  pickerWrapper: {
    flex: 1,
    marginLeft: 10,
  },
  picker: {
    flex: 1,
    height: 50,
  },
  termsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    padding: 15,
    height: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  termsScroll: {
    flex: 1,
  },
  termsText: {
    fontSize: 12,
    color: '#495057',
    lineHeight: 16,
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212529',
  },
  termsSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#212529',
  },
  termsAcceptanceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  termsTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  termsAcceptanceText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 18,
  },
  termsLink: {
    color: '#0066CC',
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#0066CC',
    flex: 0.4,
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 5,
  },
  nextButton: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0.55,
  },
  disabledButton: {
    opacity: 0.6,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 5,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  loginText: {
    fontSize: 14,
    color: '#6C757D',
  },
  loginLink: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '600',
  },
});