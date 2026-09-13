export interface TeamMember {
  id: string;
  name: string;
  joinedAt: string;
  sharingEnabled: boolean;
}

export interface LocationRecord {
  memberId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  updatedAt: string;
}

export interface MemberWithLocation extends TeamMember {
  location: LocationRecord | null;
}

export interface JoinRequestBody {
  name: string;
  inviteCode: string;
}

export interface JoinResponseBody {
  memberId: string;
  name: string;
  sharingEnabled: boolean;
}

export interface LocationUpdateRequestBody {
  memberId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  sharingEnabled: boolean;
}

export interface ToggleSharingRequestBody {
  memberId: string;
  sharingEnabled: boolean;
}