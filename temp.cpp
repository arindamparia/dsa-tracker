#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  int cityCount, edgeCount;
  if (!(cin >> cityCount >> edgeCount)) {
    return 0;
  }

  vector<vector<int>> outgoingCities(cityCount + 1);
  vector<int> indegree(cityCount + 1, 0);
  vector<int> outdegree(cityCount + 1, 0);

  for (int i = 0; i < edgeCount; i++) {
    int fromCity, toCity;
    cin >> fromCity >> toCity;
    outgoingCities[fromCity].push_back(toCity);
    outdegree[fromCity]++;
    indegree[toCity]++;
  }

  int startCity = 1;
  for (int city = 1; city <= cityCount; city++) {
    if (outdegree[city] > 0) {
      startCity = city;
      break;
    }
  }

  for (int city = 1; city <= cityCount; city++) {
    if (indegree[city] != outdegree[city]) {
      cout << "IMPOSSIBLE\n";
      return 0;
    }
  }

  vector<int> route;
  vector<int> cityStack;
  cityStack.push_back(startCity);

  while (!cityStack.empty()) {
    int currentCity = cityStack.back();

    if (!outgoingCities[currentCity].empty()) {
      int nextCity = outgoingCities[currentCity].back();
      outgoingCities[currentCity].pop_back();
      cityStack.push_back(nextCity);
    } else {
      route.push_back(currentCity);
      cityStack.pop_back();
    }
  }

  int routeLength = route.size();
  if (routeLength != edgeCount + 1) {
    cout << "IMPOSSIBLE\n";
    return 0;
  }

  reverse(route.begin(), route.end());

  for (int i = 0; i < routeLength; i++) {
    if (i > 0) {
      cout << ' ';
    }
    cout << route[i];
  }
  cout << '\n';

  return 0;
}