import { RoomClient } from '@/components/RoomClient';
export default async function TVPage({ params }: { params: Promise<{ code: string }> }) {
  return <RoomClient code={(await params).code.toUpperCase()} tv />;
}
