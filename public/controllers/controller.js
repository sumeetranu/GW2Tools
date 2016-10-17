// var myApp = angular.module('myApp', ['ngTable', 'ngRoute']);
var myApp = angular.module('myApp', ['ngTable']);

myApp.controller('AppCtrl', ['$scope', '$http', '$timeout', 'NgTableParams', '$q', Controller]);

myApp.controller('controller', ['$scope', '$http', '$timeout', 'NgTableParams', '$q', Controller]);

function Controller($scope, $http, $timeout, NgTableParams, $q) {  
	$scope.message = 'This is the home controller';

	var accessToken = ""; 

	$scope.authenticate = function(token) {
		accessToken = token;
		$scope.loggedOut = false;
		loadData();
	}

    $scope.achievementInfo = [];
    $scope.basicInfo = {};
    $scope.tableParams = new NgTableParams({}, { dataset: $scope.achievementInfo});

    $scope.loginSuccess=true;

    $scope.getName = getName;
    $scope.getPercentage = getPercentage;

    $scope.loadingData = false;

    //$scope.achievements = {};

    $scope.getDescription = getDescription;

    $scope.logout = function() {
    	accessToken = "";
    	$scope.achievementInfo = [];
    	$scope.basicInfo = {};
    	$scope.tableParams = new NgTableParams({}, { dataset: $scope.achievementInfo});
    	$scope.loggedOut = true;
    }

    $scope.loggedOut = false;

    var loadData = function() {
    	$scope.loadingData = true;
    	
    	if($scope.achievements == undefined){
			$scope.loadingData = true;
			getNames();
		} else{
			$scope.loadingData = false;
			getInfo();
		}

    }

    var testerKey = "test";

	var getInfo = function(){
		console.log('Getting info...');
		$scope.achievementInfo = [];
    	$scope.basicInfo = {};
    	$scope.tableParams = new NgTableParams({}, { dataset: $scope.achievementInfo});

    	if(accessToken==testerKey){
    		$scope.achievementInfo = testerAchievementInfo;
    		$scope.tableParams = new NgTableParams({}, { dataset: transform($scope.achievementInfo)});
    		console.log('achievementInfo:', $scope.achievementInfo);
    		$scope.loginSuccess = true;
    		$scope.basicInfo = {name:'Loading'};
    	} else{
    		// Basic account info
			var accountUrl = 'https://api.guildwars2.com//v2/account?access_token=' + accessToken;
			$http.get(accountUrl, {cache:true}).success(function(response) {
				$scope.basicInfo = response;
				$scope.loginSuccess=true;
			}).error(function(response) {
				$scope.loginSuccess=false;
				console.log('set loginSuccess to false!');
				$scope.basicInfo={};
			});

			// Account info and completion
			var achievementsUrl = 'https://api.guildwars2.com//v2/account/achievements?access_token=' + accessToken;
			$http.get(achievementsUrl, {cache:true}).success(function(response) {
				$scope.loginSuccess=true;
				$scope.achievementInfo = response.sort(function(a,b){
					var valA = (a.current*100)/a.max;
					var valB = (b.current*100)/b.max;
					return valB-valA;
				});	

				$scope.tableParams = new NgTableParams({}, { dataset: transform($scope.achievementInfo)});
				console.log('AchievementInfo:', $scope.achievementInfo);
			}).error(function(response) {
				console.log('set loginSuccess to false!');
				$scope.loginSuccess=false;
			});	
    	}

		
	}
	
   	function getDescription(achievement){
   		var description = $scope.achievements[achievement.id].description;
   		var requirement = $scope.achievements[achievement.id].requirement;
   		var ret = description.replace('<c=@flavor>','') + ' ' + requirement.replace('<c=@flavor>','');
   		return ret;
   	}

    function transform(data){
    	ret = [];
    	for(var i=0; i<data.length; i++){
    		if(data[i].done==false){
    			var curData = data[i];
    			var curRet = {
	    			name: $scope.getName(curData.id),
	    			totalCompletion: curData.current + ' / ' + curData.max,
	    			totalPercentage: getPercentage(curData),
	    			tierCompletion: getTierCompletion(curData),
	    			tierPercentage: getTierPercentage(curData),
	    			tierPoints: getTierPoints(curData),
	    			description: getDescription($scope.achievements[curData.id]),
	    			categoryName: $scope.achievements[curData.id].categoryName,
	    			categoryDescription: $scope.achievements[curData.id].categoryDescription
    			};
    			ret.push(curRet);
    		}
    	}
    	return ret;
    }

    function getClosestTier(curData){
    	// achievement -> current, max (need to use current)
    	var current = curData.current;
    	var achievement = $scope.achievements[curData.id];
    	var num = 0;
    	var count = 0;
    	var points = 0;
    	while(num<=current){
    		num = achievement.tiers[count].count;
    		points = achievement.tiers[count].points;
    		count = count+1;
    	}

    	return {number:num, points:points};
    }

    function getTierPoints(curData){
    	var closestTier = getClosestTier(curData);
    	return closestTier.points;
    }

    function getTierCompletion(curData){
    	var current = curData.current;
    	var closestTier = getClosestTier(curData);

    	return current + ' / ' + closestTier.number;
    }

    function getTierPercentage(achievement){
    	var current = achievement.current;
    	var closestTier = getClosestTier(achievement);
		var percent=(achievement.current*1.0)/closestTier.number*100;
		var rounded = percent.toFixed(2)

    	return rounded;
    }

	function getPercentage(achievement) {
		var percent=(achievement.current*1.0)/achievement.max*100;
		var rounded = percent.toFixed(2)
		return rounded;
	}

	$scope.loadingPercentage = 0;

	function getNames() {
		$scope.achievements = [];
		var numAchievements = 0;
		var arr = [];
		var arr1 = [];
		// Get total number

		var numCategories = 0;
		var categoryArr = [];

		var tempUrl;

		var categoryMapping = {};

		var categoryUrl = 'https://api.guildwars2.com/v2/achievements/categories';
		var categoryBaseUrl = categoryUrl + '/';
		console.log('category url:', categoryUrl);

		// If test, return hardcoded data
		if(accessToken==testerKey){
			$scope.achievements = testAchievements;
			console.log('Scope.achievements is:', $scope.achievements);

			$scope.loadingData=false;
			getInfo();
			return;
		}

		$http.get(categoryUrl, {cache:true}).then(function(response) {
			numCategories = response.data.length;
			//console.log('categories initial response:', response, ' with data:', response.data, ' with length:', numCategories);
			for(var i=0; i<numCategories; i++){
				tempUrl = categoryBaseUrl + response.data[i];
				categoryArr.push($http.get(tempUrl, {cache:true}));
			}

			$q.all(categoryArr).then(function(ret) {
				//console.log('processing ret:', ret);
				for(var i=0; i<ret.length; i++){
					var data = ret[i].data;
					//console.log('Name:', data.name, ' description:', data.achievements);
					for(var j=0; j<data.achievements.length; j=j+1){
						var index = data.achievements[j];
						categoryMapping[index] = {name:data.name, description:data.description};
					}
					if(i==ret.length-1){
						console.log('DONE! Category mapping is:', categoryMapping);
						var achievementUrl = 'https://api.guildwars2.com/v2/achievements';
						var baseUrl = achievementUrl + '/'
						$http.get(achievementUrl, {cache:true}).then(function(response1) {
							numAchievements = response1.data.length;
							for(var l=0; l<numAchievements; l++){
								var newUrl = baseUrl + response1.data[l];
								arr1.push($http.get(newUrl, {cache:true}));
							}
							console.log('arr1:', arr1);
							$q.all(arr1).then(function(ret2) {
								console.log('.then:', ret2.length);
								for(var j=0; j<ret2.length; j++){
									var data = ret2[j].data;
									console.log('j:', j);
									//console.log('data id:', data.id);
									//console.log('cat mapping here:', categoryMapping[data.id]);
									if(categoryMapping[data.id]){
										data.categoryName=categoryMapping[data.id].name;
										data.categoryDescription = categoryMapping[data.id].description;
										if(data.categoryDescription!=''){
											console.log('Name:', data.categoryName, ' description:', data.categoryDescription);
										}
									} else{
										data.categoryName='None';
										data.categoryDescription = '';
									}
									$scope.achievements[data.id] = data;
									//console.log('j:', j);
									if(j==ret2.length-1){
										console.log('ret2 end!', j);
										getInfo();
										$scope.basicInfo = {name:'Loading'};
										$scope.loadingData=false;
										console.log('achievs:', $scope.achievements);
									}
								}
							});
						});	
					}
				}
			});
		});
	}


	function getName(id) {
		return $scope.achievements[id].name;
	}

	// Hard coded data for test keys
	var testerAchievementInfo = [
    	{
    		current:47,
    		done:false,
    		id:3069,
    		max:50
    	},
    	{
    		current:12,
    		done:false,
    		id:863,
    		max:15
    	},
    	{
    		current:629,
    		done:false,
    		id:3,
    		max:1000
    	},
    	{
    		current:2,
    		done:false,
    		id:2733,
    		max:5
    	},
    	{
    		current:4,
    		done:false,
    		id:1718,
    		max:37
    	}
    	
    ];

    var testAchievements = {
    	3069:{
    		categoryDescription:"",
    		categoryName:"Revenge of the Capricorn",
    		description:"Quick, while they're distracted!",
    		id: 3069,
    		name:"Opportunist",
    		requirement:"Neutralize  enemy capture point during rated Revenge of the Capricorn matches.",
    		tiers:[
    			{count:1, points:1},
    			{count:5, points:1},
    			{count:10, points:1},
    			{count:15, points:1},
    			{count:25, points:1},
    			{count:50, points:3}
    		],
    		type:"Default"	
    	},
    	863:{
    		categoryDescription:"",
    		categoryName:"Super Adventure Box: World 1",
    		description:"...And complete a senior capstone project on bauble theory.",
    		id: 863,
    		name:"Minor in Achievement",
    		requirement:"Complete 15 achievements in World 1.",
    		tiers:[
    			{count:15, points:15}
    		],
    		type:"Default"	
    	},
    	3:{
    		categoryDescription:"",
    		categoryName:"Slayer",
    		description:"Scrape these scavengers off the surface of Tyria.",
    		id: 3,
    		name:"Skritt Slayer",
    		requirement:"Kill  skritt.",
    		tiers:[
    			{count:10, points:1},
    			{count:100, points:5},
    			{count:500, points:5},
    			{count:1000, points:5}
    		],
    		type:"Default"	
    	},
    	2733:{
    		categoryDescription:"",
    		categoryName:"Year of the Ascension Part I",
    		description:"Completing this achievement advances the League Professional—Recruit achievement.",
    		id: 2733,
    		name:"League Necromancer—Recruit",
    		requirement:"Win 5 ranked matches as a necromancer.",
    		tiers:[
    			{count:1, points:1},
    			{count:3, points:1},
    			{count:5, points:1}
    		],
    		type:""	
    	},
    	1718:{
    		categoryDescription:"",
    		categoryName:"Basic Collections",
    		description:"",
    		id: 1718,
    		name:"Honor of the Waves Collector",
    		requirement:"Use Symbols of Koda from Honor of the Waves to unlock all  weapon and armor skins in your wardrobe.",
    		tiers:[
    			{count:1, points:1},
    			{count:18, points:1},
    			{count:37, points:1}
    		],
    		type:""	
    	}
    };

}
