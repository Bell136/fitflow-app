import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase.client';
import { Alert } from 'react-native';

export type PhotoType = 'avatar' | 'progress' | 'meal';

class PhotoService {
  // Request permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload photos.'
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  // Pick image from library
  async pickImage(photoType: PhotoType): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: photoType === 'avatar' ? [1, 1] : [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }
      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
      return null;
    }
  }

  // Take photo with camera
  async takePhoto(photoType: PhotoType): Promise<string | null> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera permissions to take photos.'
        );
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: photoType === 'avatar' ? [1, 1] : [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }
      return null;
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
      return null;
    }
  }

  // Upload photo to Supabase Storage
  async uploadPhoto(
    uri: string,
    photoType: PhotoType,
    fileName?: string
  ): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Determine bucket based on photo type
      const bucket = this.getBucketName(photoType);
      
      // Create file name with timestamp
      const timestamp = Date.now();
      const extension = uri.split('.').pop() || 'jpg';
      const finalFileName = fileName || `${user.id}_${timestamp}.${extension}`;
      const filePath = `${user.id}/${finalFileName}`;

      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, {
          contentType: `image/${extension}`,
          upsert: true,
        });

      if (error) throw error;

      // Get public URL if bucket is public (avatars)
      if (bucket === 'avatars') {
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);
        
        return urlData?.publicUrl || null;
      }

      // For private buckets, return the path
      return data?.path || null;
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo');
      return null;
    }
  }

  // Delete photo from Supabase Storage
  async deletePhoto(
    path: string,
    photoType: PhotoType
  ): Promise<boolean> {
    try {
      const bucket = this.getBucketName(photoType);
      
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      return false;
    }
  }

  // Get signed URL for private photos
  async getSignedUrl(
    path: string,
    photoType: PhotoType,
    expiresIn: number = 3600
  ): Promise<string | null> {
    try {
      const bucket = this.getBucketName(photoType);
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) throw error;
      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
  }

  // List user's photos in a bucket
  async listUserPhotos(photoType: PhotoType): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const bucket = this.getBucketName(photoType);
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(user.id, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error listing photos:', error);
      return [];
    }
  }

  // Update user avatar
  async updateAvatar(uri: string): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Upload new avatar
      const avatarUrl = await this.uploadPhoto(uri, 'avatar', 'avatar.jpg');
      
      if (avatarUrl) {
        // Update user profile with new avatar URL
        const { error } = await supabase
          .from('User')
          .update({ avatar_url: avatarUrl })
          .eq('id', user.id);

        if (error) throw error;
        return avatarUrl;
      }
      
      return null;
    } catch (error) {
      console.error('Error updating avatar:', error);
      Alert.alert('Error', 'Failed to update avatar');
      return null;
    }
  }

  // Helper method to get bucket name
  private getBucketName(photoType: PhotoType): string {
    switch (photoType) {
      case 'avatar':
        return 'avatars';
      case 'progress':
        return 'progress-photos';
      case 'meal':
        return 'meal-photos';
      default:
        return 'avatars';
    }
  }
}

export const photoService = new PhotoService();