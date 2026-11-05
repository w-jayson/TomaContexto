namespace TomaSeuContexto.Application.Common;

public static class FuzzyMatcher
{
    /// <summary>
    /// Computes the Damerau-Levenshtein distance between two strings (supports adjacent transpositions like "teh" -> "the").
    /// </summary>
    public static int ComputeDistance(string source, string target)
    {
        if (string.IsNullOrEmpty(source))
        {
            return target?.Length ?? 0;
        }

        if (string.IsNullOrEmpty(target))
        {
            return source.Length;
        }

        var s = source.Trim().ToLowerInvariant();
        var t = target.Trim().ToLowerInvariant();

        if (s == t)
        {
            return 0;
        }

        var n = s.Length;
        var m = t.Length;
        var dp = new int[n + 1, m + 1];

        for (var i = 0; i <= n; i++)
        {
            dp[i, 0] = i;
        }

        for (var j = 0; j <= m; j++)
        {
            dp[0, j] = j;
        }

        for (var i = 1; i <= n; i++)
        {
            for (var j = 1; j <= m; j++)
            {
                var cost = s[i - 1] == t[j - 1] ? 0 : 1;

                dp[i, j] = Math.Min(
                    Math.Min(dp[i - 1, j] + 1, dp[i, j - 1] + 1),
                    dp[i - 1, j - 1] + cost);

                if (i > 1 && j > 1 && s[i - 1] == t[j - 2] && s[i - 2] == t[j - 1])
                {
                    dp[i, j] = Math.Min(dp[i, j], dp[i - 2, j - 2] + cost);
                }
            }
        }

        return dp[n, m];
    }

    /// <summary>
    /// Returns the maximum allowed edit distance for a typo based on term length.
    /// </summary>
    public static int GetMaxAllowedDistance(string term)
    {
        var len = term?.Trim().Length ?? 0;
        if (len <= 3) return 0;
        if (len <= 6) return 1;
        return 2;
    }
}
