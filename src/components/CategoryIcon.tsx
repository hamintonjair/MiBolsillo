/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Utensils, 
  Car, 
  Gamepad2, 
  Home, 
  Heart, 
  Package,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  DollarSign,
  Filter,
  TrendingDown,
  Clock,
  Battery,
  Wifi,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Info,
  X,
  Sparkles,
  PieChart as PieIcon,
  List as ListIcon,
  PlusCircle,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  Database,
  Copy,
  RefreshCw,
  AlertTriangle,
  CloudLightning,
  Eye,
  EyeOff
} from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = '', size = 20 }) => {
  switch (name) {
    case 'Utensils':
      return <Utensils className={className} size={size} />;
    case 'Car':
      return <Car className={className} size={size} />;
    case 'Gamepad2':
      return <Gamepad2 className={className} size={size} />;
    case 'Home':
      return <Home className={className} size={size} />;
    case 'Heart':
      return <Heart className={className} size={size} />;
    case 'Package':
      return <Package className={className} size={size} />;
    case 'Plus':
      return <Plus className={className} size={size} />;
    case 'Trash2':
      return <Trash2 className={className} size={size} />;
    case 'Edit3':
      return <Edit3 className={className} size={size} />;
    case 'Calendar':
      return <Calendar className={className} size={size} />;
    case 'DollarSign':
      return <DollarSign className={className} size={size} />;
    case 'Filter':
      return <Filter className={className} size={size} />;
    case 'TrendingDown':
      return <TrendingDown className={className} size={size} />;
    case 'Clock':
      return <Clock className={className} size={size} />;
    case 'Battery':
      return <Battery className={className} size={size} />;
    case 'Wifi':
      return <Wifi className={className} size={size} />;
    case 'ChevronRight':
      return <ChevronRight className={className} size={size} />;
    case 'ChevronDown':
      return <ChevronDown className={className} size={size} />;
    case 'ChevronUp':
      return <ChevronUp className={className} size={size} />;
    case 'Sun':
      return <Sun className={className} size={size} />;
    case 'Moon':
      return <Moon className={className} size={size} />;
    case 'Info':
      return <Info className={className} size={size} />;
    case 'X':
      return <X className={className} size={size} />;
    case 'Sparkles':
      return <Sparkles className={className} size={size} />;
    case 'PieChart':
      return <PieIcon className={className} size={size} />;
    case 'List':
      return <ListIcon className={className} size={size} />;
    case 'PlusCircle':
      return <PlusCircle className={className} size={size} />;
    case 'HelpCircle':
      return <HelpCircle className={className} size={size} />;
    case 'ArrowUpRight':
      return <ArrowUpRight className={className} size={size} />;
    case 'ArrowDownRight':
      return <ArrowDownRight className={className} size={size} />;
    case 'Database':
      return <Database className={className} size={size} />;
    case 'Copy':
      return <Copy className={className} size={size} />;
    case 'RefreshCw':
      return <RefreshCw className={className} size={size} />;
    case 'AlertTriangle':
      return <AlertTriangle className={className} size={size} />;
    case 'CloudLightning':
      return <CloudLightning className={className} size={size} />;
    case 'Eye':
      return <Eye className={className} size={size} />;
    case 'EyeOff':
      return <EyeOff className={className} size={size} />;
    default:
      return <HelpCircle className={className} size={size} />;
  }
};
export default CategoryIcon;
