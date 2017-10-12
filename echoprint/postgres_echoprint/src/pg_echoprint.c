#include <stdint.h>

#include "postgres.h"
#include "fmgr.h"
#include "utils/array.h"

PG_MODULE_MAGIC;

PGDLLEXPORT Datum echoprint_compare(PG_FUNCTION_ARGS);

PG_FUNCTION_INFO_V1(echoprint_compare);

// 2 little macros borrowed from postgres contrib/_intarray module
#define ARRNELEMS(x)  ArrayGetNItems(ARR_NDIM(x), ARR_DIMS(x))
#define CHECKARRVALID(x) \
	do { \
		if (ARR_HASNULL(x) && array_contains_nulls(x)) \
			ereport(ERROR, \
					(errcode(ERRCODE_NULL_VALUE_NOT_ALLOWED), \
					 errmsg("array must not contain nulls"))); \
	} while(0)

// very losely based on the approach[1] used by spotify in their rewrite
// (there are 2 implementations: one using apache solr from echolabs and 
//	                             a rewrite in python after echolabs was bought by spotify)
//
// this basically determines a number of matching codes (uint32's) and computes a score from it
// this is a quite naive implementation, without any smart index/subfingerprint optimizations yet
// which likely won't scale beyond a million entries without modications.
// It still should be enough to get going, especially to evaluate our performance needs.
//
// [1] https://github.com/spotify/echoprint-server/blob/master/libechoprintserver.c
Datum echoprint_compare(PG_FUNCTION_ARGS)
{
	int left_elemc, right_elemc;
	int i = 0, j = 0, num = 0;
	uint32_t *left, *right;

	ArrayType *left_arr = PG_GETARG_ARRAYTYPE_P(0);
	ArrayType *right_arr = PG_GETARG_ARRAYTYPE_P(1);

	CHECKARRVALID(left_arr);
	CHECKARRVALID(right_arr);

	left_elemc = ARRNELEMS(left_arr);
	right_elemc = ARRNELEMS(right_arr);

	left = (uint32_t *)ARR_DATA_PTR(left_arr);
	right = (uint32_t *)ARR_DATA_PTR(right_arr);

	// left and right are both assumed to be sorted (asc)
	// so here we simply try to find the amount of matching codes (uint32)
	while (i < left_elemc && j < right_elemc) {
		int ielem = left[i];
		int relem = right[j];
		if (ielem == relem) {
			num++;
			i++;
			j++;
		} else if (ielem < relem) {
			i++;
		} else {
			j++;
		}
	}

	float jaccard_score = num / (float)(left_elemc + right_elemc - num);
	PG_RETURN_FLOAT4(jaccard_score);
}
