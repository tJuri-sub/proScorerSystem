import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, ScrollView } from "react-native";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc,
  DocumentData,
  QueryDocumentSnapshot 
} from "firebase/firestore";
import styles from "../../components/styles/ScoreCard"; 
import ScoreCard from "../../components/component/ScoreCard";
import { getAuth, User } from "firebase/auth";

// Define specific interfaces for different score types
interface BaseScoreData {
  id: string;
  teamId: string;
  teamName: string;
  category: string;
  timestamp?: string;
  judge?: string;
}

interface RoboScoreData extends BaseScoreData {
  // Day 1 scores
  day1Round1Score?: number;
  day1Round2Score?: number;
  day1Round3Score?: number;
  day1Round1Time?: string;
  day1Round2Time?: string;
  day1Round3Time?: string;
  day1Round1ScoredAt?: string;
  day1Round2ScoredAt?: string;
  day1Round3ScoredAt?: string;
  
  // Day 2 scores
  day2Round1Score?: number;
  day2Round2Score?: number;
  day2Round3Score?: number;
  day2Round1Time?: string;
  day2Round2Time?: string;
  day2Round3Time?: string;
  day2Round1ScoredAt?: string;
  day2Round2ScoredAt?: string;
  day2Round3ScoredAt?: string;
  
  // Legacy fields for backward compatibility
  round1Score?: number;
  round2Score?: number;
  time1?: string;
  time2?: string;
  round1ScoredAt?: string;
  round2ScoredAt?: string;
  
  // Calculated scores
  bestScore?: number;
  overallScore?: number;
  breakdown?: {
    day1BestScore?: number;
    day2BestScore?: number;
  };
}

interface FIScoreData extends BaseScoreData {
  presentationSpirit?: number;
  projectInnovation?: number;
  roboticSolution?: number;
  totalScore?: number;
}

interface FutureEngScoreData extends BaseScoreData {
  openScore1?: number;
  openScore2?: number;
  openTime1?: string;
  openTime2?: string;
  obstacleScore1?: number;
  obstacleScore2?: number;
  obstacleTime1?: string;
  obstacleTime2?: string;
  docScore?: number;
  totalScore?: number;
}

interface RobosportsScoreData extends BaseScoreData {
  // Add robosports specific fields when implemented
  overallScore?: number;
}

type ScoreData = RoboScoreData | FIScoreData | FutureEngScoreData | RobosportsScoreData;

interface RouteParams {
  teamId: string;
  teamName: string;
  category?: string;
}

interface TeamScoresProps {
  route: {
    params: RouteParams;
  };
  navigation: any; // You can replace with proper navigation type
}

interface TeamData {
  category?: string;
  [key: string]: any;
}

interface UserData {
  role?: string;
  [key: string]: any;
}

const formatDate = (iso?: string): string => {
  if (!iso) return "N/A";
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
};

const TeamScores: React.FC<TeamScoresProps> = ({ route, navigation }) => {
  const [userRole, setUserRole] = useState<string>("");
  const { teamId, teamName, category } = route.params;
  const [scores, setScores] = useState<ScoreData[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [teamCategory, setTeamCategory] = useState<string>(category || "");
  const db = getFirestore();

  // Helper function to convert Firestore document to ScoreData
  const convertDocToScore = (doc: QueryDocumentSnapshot<DocumentData>, fallbackTeamId: string, fallbackTeamName: string, fallbackCategory: string): ScoreData => {
    const data = doc.data();
    
    const baseData: BaseScoreData = {
      id: doc.id,
      teamId: data.teamId ?? fallbackTeamId,
      teamName: data.teamName ?? fallbackTeamName,
      category: data.category ?? fallbackCategory,
      timestamp: data.timestamp,
      judge: data.judge,
    };

    // Return the data with all possible fields - TypeScript will handle the union type
    return {
      ...baseData,
      // Robo fields
      day1Round1Score: data.day1Round1Score,
      day1Round2Score: data.day1Round2Score,
      day1Round3Score: data.day1Round3Score,
      day1Round1Time: data.day1Round1Time,
      day1Round2Time: data.day1Round2Time,
      day1Round3Time: data.day1Round3Time,
      day1Round1ScoredAt: data.day1Round1ScoredAt,
      day1Round2ScoredAt: data.day1Round2ScoredAt,
      day1Round3ScoredAt: data.day1Round3ScoredAt,
      day2Round1Score: data.day2Round1Score,
      day2Round2Score: data.day2Round2Score,
      day2Round3Score: data.day2Round3Score,
      day2Round1Time: data.day2Round1Time,
      day2Round2Time: data.day2Round2Time,
      day2Round3Time: data.day2Round3Time,
      day2Round1ScoredAt: data.day2Round1ScoredAt,
      day2Round2ScoredAt: data.day2Round2ScoredAt,
      day2Round3ScoredAt: data.day2Round3ScoredAt,
      round1Score: data.round1Score,
      round2Score: data.round2Score,
      time1: data.time1,
      time2: data.time2,
      round1ScoredAt: data.round1ScoredAt,
      round2ScoredAt: data.round2ScoredAt,
      bestScore: data.bestScore,
      overallScore: data.overallScore,
      breakdown: data.breakdown,
      
      // FI fields
      presentationSpirit: data.presentationSpirit,
      projectInnovation: data.projectInnovation,
      roboticSolution: data.roboticSolution,
      
      // Future Engineering fields
      openScore1: data.openScore1,
      openScore2: data.openScore2,
      openTime1: data.openTime1,
      openTime2: data.openTime2,
      obstacleScore1: data.obstacleScore1,
      obstacleScore2: data.obstacleScore2,
      obstacleTime1: data.obstacleTime1,
      obstacleTime2: data.obstacleTime2,
      docScore: data.docScore,
      
      // Common fields
      totalScore: data.totalScore,
    } as ScoreData;
  };

  // Helper function to get timestamp from score for sorting
  const getScoreTimestamp = (score: ScoreData): string => {
    const roboScore = score as RoboScoreData;
    return score.timestamp || 
           roboScore.round1ScoredAt || 
           roboScore.day1Round1ScoredAt || 
           "";
  };

  useEffect(() => {
    const fetchUserRole = async (): Promise<void> => {
      try {
        const auth = getAuth();
        const currentUser: User | null = auth.currentUser;
        if (currentUser) {
          const userDoc = await getDoc(doc(db, "admin-users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserData;
            setUserRole(userData.role || "");
          }
        }
      } catch (e) {
        console.error("Failed to fetch user role", e);
      }
    };

    fetchUserRole();
  }, [db]);

  useEffect(() => {
    const fetchTeamCategory = async (): Promise<void> => {
      // If category is not provided in route params, fetch it from team data
      if (!category && teamId) {
        try {
          const teamDoc = await getDoc(doc(db, "teams", teamId));
          if (teamDoc.exists()) {
            const teamData = teamDoc.data() as TeamData;
            setTeamCategory(teamData.category || "");
          }
        } catch (e) {
          console.error("Failed to fetch team category", e);
        }
      }
    };

    fetchTeamCategory();
  }, [teamId, category, db]);

  useEffect(() => {
    const fetchScores = async (): Promise<void> => {
      setLoading(true);
      try {
        // Query multiple collections that might contain scores
        const collections: string[] = ["scores", "scores2"];
        const queries = collections.map(collectionName => 
          query(collection(db, collectionName), where("teamId", "==", teamId))
        );
        
        const snapshots = await Promise.all(queries.map(q => getDocs(q)));
        
        // Combine results from all collections
        const allDocs = snapshots.flatMap(snapshot => snapshot.docs);
        
        if (allDocs.length > 0) {
          const allScores: ScoreData[] = allDocs.map(doc => 
            convertDocToScore(doc, teamId, teamName, teamCategory)
          );
          
          // Sort scores by timestamp (most recent first)
          const sortedScores = allScores.sort((a, b) => {
            const aTime = getScoreTimestamp(a);
            const bTime = getScoreTimestamp(b);
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          });
          
          setScores(sortedScores);
        } else {
          setScores(null);
        }
      } catch (e) {
        console.error("Failed to fetch scores:", e);
        setScores(null);
      } finally {
        setLoading(false);
      }
    };
    
    if (teamId) {
      fetchScores();
    }
  }, [teamId, teamName, teamCategory, db]);

  const handleScoreDeleted = (): void => {
    // Refetch scores after deletion
    const refetchScores = async (): Promise<void> => {
      setLoading(true);
      try {
        const collections: string[] = ["scores", "scores2"];
        const queries = collections.map(collectionName => 
          query(collection(db, collectionName), where("teamId", "==", teamId))
        );
        
        const snapshots = await Promise.all(queries.map(q => getDocs(q)));
        const allDocs = snapshots.flatMap(snapshot => snapshot.docs);
        
        if (allDocs.length > 0) {
          const allScores: ScoreData[] = allDocs.map(doc => 
            convertDocToScore(doc, teamId, teamName, teamCategory)
          );
          
          const sortedScores = allScores.sort((a, b) => {
            const aTime = getScoreTimestamp(a);
            const bTime = getScoreTimestamp(b);
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          });
          
          setScores(sortedScores);
        } else {
          setScores(null);
        }
      } catch (e) {
        console.error("Failed to refetch scores:", e);
        setScores(null);
      } finally {
        setLoading(false);
      }
    };
    
    refetchScores();
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={{ marginTop: 16, textAlign: "center" }}>Loading scores...</Text>
      </View>
    );
  }

  if (!scores || scores.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.teamName}>{teamName}</Text>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ textAlign: "center", fontSize: 16, color: "#666" }}>
            No scores found for this team.
          </Text>
          {teamCategory && (
            <Text style={{ textAlign: "center", fontSize: 14, color: "#888", marginTop: 8 }}>
              Category: {teamCategory.toUpperCase()}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.teamName}>{teamName}</Text>
      {teamCategory && (
        <Text style={{ 
          textAlign: "center", 
          fontSize: 16, 
          fontWeight: "bold", 
          color: "#1976d2", 
          marginBottom: 16 
        }}>
          Category: {teamCategory.toUpperCase()}
        </Text>
      )}
      <Text style={{ 
        textAlign: "center", 
        fontSize: 14, 
        color: "#666", 
        marginBottom: 16 
      }}>
        {scores.length} score{scores.length !== 1 ? 's' : ''} found
      </Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {scores.map((score: ScoreData, idx: number) => (
          <View key={`${score.id}-${idx}`} style={{ marginBottom: 16 }}>
            {/* Add a header for each score entry if there are multiple */}
            {scores.length > 1 && (
              <View style={{
                backgroundColor: "#f5f5f5",
                padding: 8,
                borderRadius: 4,
                marginBottom: 8,
              }}>
                <Text style={{ 
                  fontSize: 14, 
                  fontWeight: "bold", 
                  color: "#333",
                  textAlign: "center" 
                }}>
                  Score Entry #{scores.length - idx}
                </Text>
                {score.timestamp && (
                  <Text style={{ 
                    fontSize: 12, 
                    color: "#666",
                    textAlign: "center",
                    marginTop: 2
                  }}>
                    {formatDate(score.timestamp)}
                  </Text>
                )}
              </View>
            )}
            <ScoreCard 
              score={score} 
              userRole={userRole}
              category={score.category || teamCategory || ""}
              onDeleted={handleScoreDeleted}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default TeamScores;