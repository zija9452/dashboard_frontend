/**
 * Cloudinary Image Optimization Utilities
 *
 * Best practices for Cloudinary image delivery:
 * - f_auto: Auto-format (WebP/AVIF for modern browsers)
 * - q_auto: Auto-quality (balance between size and quality)
 * - Responsive transformations for different screen sizes
 */

'use client';

import React from 'react';

/**
 * Optimize Cloudinary URL for best performance
 * 
 * Features:
 * - Adds f_auto for automatic WebP/AVIF conversion
 * - Adds q_auto for automatic quality optimization
 * - Removes file extensions for format flexibility
 * 
 * @param url - Original Cloudinary URL
 * @returns Optimized Cloudinary URL
 * 
 * @example
 * // Before:
 * https://res.cloudinary.com/dizmve1g6/image/upload/v1774437699/products/image.jpg
 * 
 * // After:
 * https://res.cloudinary.com/dizmve1g6/image/upload/f_auto,q_auto/v1774437699/products/image
 */
export function optimizeCloudinaryUrl(url: string): string {
  // Return empty string if no URL provided
  if (!url || typeof url !== 'string') return '';
  
  // Return as-is if not a Cloudinary URL
  if (!url.includes('cloudinary.com')) return url;
  
  try {
    let optimizedUrl = url;
    
    // Remove file extension (.jpg, .jpeg, .png, .gif, .webp)
    optimizedUrl = optimizedUrl.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
    
    // Check if transformation parameters already exist
    const hasFormat = optimizedUrl.includes('f_auto') || optimizedUrl.includes('f_');
    const hasQuality = optimizedUrl.includes('q_auto') || optimizedUrl.includes('q_');
    
    // Add transformation parameters if missing
    if (!hasFormat || !hasQuality) {
      // Find the upload segment and insert transformations after it
      optimizedUrl = optimizedUrl.replace(
        '/upload/',
        '/upload/f_auto,q_auto/'
      );
    }
    
    return optimizedUrl;
  } catch (error) {
    // If any error occurs, return original URL
    console.warn('Failed to optimize Cloudinary URL:', url, error);
    return url;
  }
}

/**
 * Get responsive image URL for different screen sizes
 * 
 * @param url - Original Cloudinary URL
 * @param width - Target width in pixels
 * @returns Optimized URL with width transformation
 * 
 * @example
 * // Thumbnail (100x100)
 * getResponsiveCloudinaryUrl(imageUrl, 100)
 * 
 * // Medium (400x400)
 * getResponsiveCloudinaryUrl(imageUrl, 400)
 * 
 * // Large (800x800)
 * getResponsiveCloudinaryUrl(imageUrl, 800)
 */
export function getResponsiveCloudinaryUrl(url: string, width: number): string {
  if (!url || typeof url !== 'string') return '';
  if (!url.includes('cloudinary.com')) return url;
  
  try {
    let optimizedUrl = optimizeCloudinaryUrl(url);
    
    // Remove existing width transformation if present
    optimizedUrl = optimizedUrl.replace(/w_\d+,?/, '');
    
    // Insert width transformation after f_auto,q_auto
    if (optimizedUrl.includes('f_auto,q_auto')) {
      optimizedUrl = optimizedUrl.replace(
        'f_auto,q_auto',
        `f_auto,q_auto,w_${width}`
      );
    } else if (optimizedUrl.includes('/upload/')) {
      optimizedUrl = optimizedUrl.replace(
        '/upload/',
        `/upload/w_${width},f_auto,q_auto/`
      );
    }
    
    return optimizedUrl;
  } catch (error) {
    console.warn('Failed to get responsive Cloudinary URL:', url, error);
    return url;
  }
}

/**
 * Image size presets for common use cases
 */
export const IMAGE_SIZES = {
  thumbnail: 100,      // Small thumbnails
  small: 200,          // List views
  medium: 400,         // Card views
  large: 800,          // Detail views
  xlarge: 1200,        // Full-screen/zoom
} as const;

/**
 * Get optimized image URL for specific use case
 * 
 * @param url - Original Cloudinary URL
 * @param size - Size preset or custom width
 * @returns Optimized URL
 * 
 * @example
 * // Using preset
 * getImageUrl(imageUrl, 'thumbnail')
 * 
 * // Custom size
 * getImageUrl(imageUrl, 350)
 */
export function getImageUrl(url: string, size: keyof typeof IMAGE_SIZES | number = 'medium'): string {
  const width = typeof size === 'number' ? size : IMAGE_SIZES[size];
  return getResponsiveCloudinaryUrl(url, width);
}

/**
 * Generate srcSet for responsive images
 * 
 * @param url - Original Cloudinary URL
 * @param sizes - Array of widths to generate
 * @returns srcSet string for img tag
 * 
 * @example
 * // Default sizes
 * getSrcSet(imageUrl)
 * // Returns: "url/w_100,f_auto,q_auto 100w, url/w_200,f_auto,q_auto 200w, ..."
 * 
 * // Custom sizes
 * getSrcSet(imageUrl, [300, 600, 900])
 */
export function getSrcSet(url: string, sizes: number[] = [100, 200, 400, 800, 1200]): string {
  if (!url || typeof url !== 'string') return '';
  if (!url.includes('cloudinary.com')) return '';
  
  return sizes
    .map(width => {
      const optimizedUrl = getResponsiveCloudinaryUrl(url, width);
      return `${optimizedUrl} ${width}w`;
    })
    .join(', ');
}

/**
 * Get loading attribute value based on image position
 * 
 * @param priority - Image priority (above fold = true)
 * @returns Loading attribute value
 * 
 * @example
 * // Above fold images (hero, main product)
 * getLoadingAttribute(true) // Returns 'eager'
 * 
 * // Below fold images (thumbnails, list items)
 * getLoadingAttribute(false) // Returns 'lazy'
 */
export function getLoadingAttribute(priority?: boolean): 'eager' | 'lazy' {
  return priority ? 'eager' : 'lazy';
}

/**
 * CloudinaryImage component props
 */
export interface CloudinaryImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Cloudinary image URL */
  src: string;
  /** Image priority (loads above-fold images first) */
  priority?: boolean;
  /** Size preset or custom width */
  size?: keyof typeof IMAGE_SIZES | number;
  /** Enable lazy loading (default: true) */
  lazy?: boolean;
  /** Fallback image if Cloudinary fails */
  fallbackSrc?: string;
  /** Alt text for accessibility */
  alt?: string;
}

/**
 * React component for optimized Cloudinary images
 * 
 * Features:
 * - Automatic WebP/AVIF conversion
 * - Responsive image loading
 * - Lazy loading for below-fold images
 * - Error handling with fallback
 * 
 * @example
 * // Basic usage
 * <CloudinaryImage src={product.image} alt="Product" />
 * 
 * // With size preset
 * <CloudinaryImage src={product.image} size="thumbnail" alt="Product" />
 * 
 * // Priority loading (above fold)
 * <CloudinaryImage src={product.image} priority alt="Product" />
 * 
 * // Custom size
 * <CloudinaryImage src={product.image} size={350} alt="Product" />
 */
export function CloudinaryImage({
  src,
  priority = false,
  size = 'medium',
  lazy = true,
  fallbackSrc,
  alt = '',
  className,
  ...props
}: CloudinaryImageProps) {
  const optimizedSrc = getImageUrl(src, size);
  const loading = priority ? 'eager' : lazy ? 'lazy' : undefined;
  
  return (
    <img
      src={optimizedSrc}
      alt={alt}
      loading={loading}
      className={className}
      {...props}
      onError={(e) => {
        if (fallbackSrc && e.currentTarget.src !== fallbackSrc) {
          e.currentTarget.src = fallbackSrc;
        }
        props.onError?.(e);
      }}
    />
  );
}
