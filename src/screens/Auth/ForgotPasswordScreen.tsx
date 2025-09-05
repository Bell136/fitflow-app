import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SupabaseAuthService } from '../../services/auth.supabase.service';
import { AuthError, ValidationError } from '../../types/errors';

const authService = new SupabaseAuthService();

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  const validateEmail = (email: string): boolean => {
    setEmailError('');
    
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmail(email)) return;

    setLoading(true);
    try {
      await authService.requestPasswordReset(email);
      setEmailSent(true);
    } catch (error) {
      if (error instanceof ValidationError) {
        setEmailError(error.message);
      } else if (error instanceof AuthError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login' as never);
  };

  const handleTryAgain = () => {
    setEmailSent(false);
    setEmail('');
    setEmailError('');
  };

  if (emailSent) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#00A67E" />
            </View>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent password reset instructions to
            </Text>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <View style={styles.instructionItem}>
              <View style={styles.instructionIconContainer}>
                <Ionicons name="mail-outline" size={24} color="#0066CC" />
              </View>
              <View style={styles.instructionTextContainer}>
                <Text style={styles.instructionTitle}>Check your inbox</Text>
                <Text style={styles.instructionText}>
                  Look for an email from FitFlow with reset instructions
                </Text>
              </View>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.instructionIconContainer}>
                <Ionicons name="link-outline" size={24} color="#0066CC" />
              </View>
              <View style={styles.instructionTextContainer}>
                <Text style={styles.instructionTitle}>Click the reset link</Text>
                <Text style={styles.instructionText}>
                  Follow the link in the email to create a new password
                </Text>
              </View>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.instructionIconContainer}>
                <Ionicons name="time-outline" size={24} color="#0066CC" />
              </View>
              <View style={styles.instructionTextContainer}>
                <Text style={styles.instructionTitle}>Link expires in 15 minutes</Text>
                <Text style={styles.instructionText}>
                  Make sure to reset your password within 15 minutes
                </Text>
              </View>
            </View>
          </View>

          {/* Troubleshooting */}
          <View style={styles.troubleshootingContainer}>
            <Text style={styles.troubleshootingTitle}>Didn't receive the email?</Text>
            <View style={styles.troubleshootingList}>
              <Text style={styles.troubleshootingItem}>• Check your spam folder</Text>
              <Text style={styles.troubleshootingItem}>• Make sure the email address is correct</Text>
              <Text style={styles.troubleshootingItem}>• Wait a few minutes for the email to arrive</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.tryAgainButton}
              onPress={handleTryAgain}
            >
              <Ionicons name="refresh-outline" size={20} color="#0066CC" />
              <Text style={styles.tryAgainButtonText}>Try Different Email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToLogin}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="lock-closed" size={50} color="#0066CC" />
          </View>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you instructions to reset your password
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#6C757D" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, emailError && styles.inputError]}
              placeholder="Enter your email address"
              placeholderTextColor="#ADB5BD"
              value={email}
              onChangeText={(text) => {
                setEmail(text.toLowerCase());
                if (emailError) setEmailError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

          {/* Reset Button */}
          <TouchableOpacity
            style={[styles.resetButton, loading && styles.disabledButton]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.resetButtonText}>Send Reset Instructions</Text>
                <Ionicons name="paper-plane-outline" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {/* Additional Info */}
          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#00A67E" />
              <Text style={styles.infoText}>
                We'll never share your email address with anyone
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={20} color="#FFA500" />
              <Text style={styles.infoText}>
                Reset links expire after 15 minutes for security
              </Text>
            </View>
          </View>
        </View>

        {/* Back to Login */}
        <View style={styles.loginContainer}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleBackToLogin}
          >
            <Ionicons name="arrow-back" size={16} color="#0066CC" />
            <Text style={styles.loginButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>

        {/* Support */}
        <View style={styles.supportContainer}>
          <Text style={styles.supportText}>
            Still having trouble? Contact our support team
          </Text>
          <TouchableOpacity style={styles.supportButton}>
            <Text style={styles.supportButtonText}>Get Help</Text>
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
    justifyContent: 'center',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 30,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '600',
    textAlign: 'center',
  },
  form: {
    paddingHorizontal: 30,
    marginBottom: 30,
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
  errorText: {
    fontSize: 12,
    color: '#E03131',
    marginBottom: 15,
    marginLeft: 5,
  },
  resetButton: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 25,
  },
  disabledButton: {
    opacity: 0.6,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  infoContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#495057',
    marginLeft: 12,
    flex: 1,
    lineHeight: 18,
  },
  instructionsContainer: {
    paddingHorizontal: 30,
    marginBottom: 30,
  },
  instructionItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  instructionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  instructionTextContainer: {
    flex: 1,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 18,
  },
  troubleshootingContainer: {
    paddingHorizontal: 30,
    marginBottom: 30,
  },
  troubleshootingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
    textAlign: 'center',
  },
  troubleshootingList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  troubleshootingItem: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
    lineHeight: 18,
  },
  buttonContainer: {
    paddingHorizontal: 30,
    marginBottom: 30,
  },
  tryAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    height: 50,
    borderWidth: 1,
    borderColor: '#0066CC',
    marginBottom: 15,
  },
  tryAgainButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  backButton: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loginContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  loginButtonText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '500',
    marginLeft: 8,
  },
  supportContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  supportText: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 12,
  },
  supportButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  supportButtonText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
});