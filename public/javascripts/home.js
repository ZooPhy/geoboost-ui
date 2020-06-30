app = angular.module('ZoDo', ['ngRoute', 'ngSanitize', 'ngCsv']);

// angular.module('ZoDo', ['ngSanitize', 'ngCsv']);
// angular.module('ZoDo', ['ngCsv']);

angular.module('ZoDo').filter('trustAsHtml',['$sce', function($sce) {
  return function(text) {
    return $sce.trustAsHtml(text);
  };
}]);

angular.module('ZoDo').controller('homeController', function ($scope, $http, $timeout) {
  // GENBANKIDS_REGEX = "^(\s|,)*(([A-Z]{1,2}[0-9]{4,7})((\s|,)+([A-Z]{1,2}[0-9]{4,7}))*)(\s|,)*$";
  GENBANKIDS_REGEX = /^(\s*[A-Z]{1,2}_?[0-9]{4,7}(?:\s*,?\s*[A-Z]{1,2}_?[0-9]{4,7})*\s*,*)$/;
  PUBMEDIDS_REGEX = /^(\s*(?:PMC)?[0-9]{4,9}(?:\s*,?\s*(?:PMC)?[0-9]{4,9})*\s*)$/;
  // GENBANKIDS_REGEX = new RegExp("^(?:\s|,)*((?:[A-Z]{1,2}[0-9]{4,7})(?:(?:\s|,)+(?:[A-Z]{1,2}[0-9]{4,7}))*)(?:\s|,)*$");
  // PUBMEDIDS_REGEX = new RegExp("^((?:(?:PMC)?[0-9]{4,9})(?:(?:\s|,)+(?:(?:PMC)?[0-9]{4,9}))*)$");
  $scope.geoLocMap = null;
  $scope.selectedRecord = null;

  $scope.inpType = 1;
  $scope.inpText = null;
  $scope.results = null;
  $scope.extractMsg = null;
  $scope.errorMsg = null;
  $scope.processing = false;
  $scope.processingTime = 0;

  $scope.clearLayerFeatures = null;
  $scope.viewLayerfeatures = null;
  $scope.geoLocMap = null;
  
  // $scope.gbcols = ["gbid", "gbloc", "sufficient", "pmid", "pubmedlocs"];
  $scope.gbcols = ["gbid", "gbloc", "sufficient", "pmids"];
  $scope.pmcols = ["pmid", "pubmedlocs"];
  // $scope.textcols = ["text", "context"];
  $scope.textcols = ["context"];

  $scope.sufficiencyLevels = ['PCLI', 'ADM1', 'ADM2', 'ADM3'];
  $scope.selSuffLevel = 'ADM1';

  $scope.maxPossibleLocations = [1, 5, 10, 20];
  $scope.selMaxPossLocations = 10;

  $scope.showDetail = false;

  htmlRegex = new RegExp("<[a-z/][\s\S]*>");

  $scope.threshold = 0.01;

  $scope.initFields = function() {
    console.log("Initializing everything");
    $scope.setinput(1);
    if($scope.geoLocMap == null){
      console.log('initializing map');
      initMap();
    }

  }

  $scope.isActive = function(inputtype) {
      return inputtype == 1;
  }
  
  $scope.showColumn = function(column) {
    show = false;
    if ($scope.inpType == 1){
      show = $scope.gbcols.includes(column);
    } else if ($scope.inpType == 2) {
      show = $scope.pmcols.includes(column);
    } else {
      show = $scope.textcols.includes(column);
    }
    return show;
  }

  $scope.showLocType = function(loctype) {
    show = false;
    if ($scope.selectedRecord) {
      if (loctype=='best' || loctype=='poss'){
        if ($scope.selectedRecord.poss_locs.length > 0){
          if ($scope.selectedRecord.poss_locs[0].Sufficient)
            show = true;
        }
      } else if (loctype=='strain') {
        if (!isEmptyObject($scope.selectedRecord.strain_loc)){
          show = true;
        }
      } else if (loctype=='country') {
        if (!isEmptyObject($scope.selectedRecord.country_loc)){
          show = true;
        }
      } else if (loctype=='latlon') {
        if (!isEmptyObject($scope.selectedRecord.latlon_loc)){
          show = true;
        }
      }
    }
    return show;
  }

  $scope.showDetailPanel = function() {
    if ($scope.inpType == 1) {
      if ($scope.selectedRecord && $scope.selectedRecord.pmobjs.length > 0) {
        $scope.showDetail = true;
      }
    } else if ($scope.inpType == 2) {
      if ($scope.selectedRecord){
        $scope.showDetail = true;
      }
    }
    $scope.showDetail = false;
  }

  $scope.closeDetail = function() {
    $scope.showDetail = false;
  }

  $scope.setinput = function(inputtype) {
    // clear results
    $scope.results = null;
    $('#extract-results').addClass('hidden');
    $('#extract-errors').addClass('hidden');
    $scope.extractMsg = null;
    $scope.errorMsg = null;
    $scope.clearLayerFeatures();
    // set input type
    if(inputtype == 1){
      $scope.inpType = 1;
      $scope.inpText = "KU497555, KY441403, MF073357, MF073358, KY558999, KY559001, KY559003, KY559004, KY559005, KY559006, KY559007, KY559009";
      // $scope.inpText = "GQ457496, KU497555, AB110657, AB110658, KM078979, AB570999, AB559889, KJ579442, KF383121, KY042039, AB570996, AB570997, KF383041, AB433853, AB559916";
      // $scope.inpText = "JN802579,JN802580,JN802588,JN802591"
    } else if (inputtype == 2){
      $scope.inpType = 2;
      // $scope.inpText = "PMC2570840";
      $scope.inpText = "15297743, 9420202, 26897108";
    } else {
      $scope.inpType = 3;
      $scope.inpText= "A previously healthy 52-year-old Australian woman had malaise and rash after a 9-day holiday to Jakarta, Indonesia. On arrival in Australia, she initially reported some fatigue and non-specific malaise, followed by a prominent headache. The headache subsequently began to subside, but on day 4 of her symptoms, a maculopapular rash developed that started on her trunk before spreading to her back and limbs, but not her face. This rash was accompanied by generalized myalgia, some loose bowel movements, and an occasional dry cough. She did not experience any significant sweats or rigors.\n"+
      "Examination on day 5 of her illness showed mild bilateral conjunctivitis and a diffuse maculopapular rash, but no evidence of lymphadenopathy or tenosynovitis. Investigations at this time showed a total leukocyte count of 3.6 × 109 cells /L (reference range = 4.0–11.0 × 109 cells/L), a hemoglobin level of 137 g/L (reference range = 115–150 g/L), a hematocrit of 39%, and platelet count of 230 × 109 cells/L (reference range = 140–400 × 109 cells/L). Reactive lymphocytes were present on a blood film. Baseline liver and renal function test results were normal.\n"+
      "Dengue serologic analysis on day 5 of her illness showed a positive result for IgG, a weakly positive result for IgM, but a negative result for nonstructural protein 1 (NS1 antigen) by enzyme immunoassay. A generic flavivirus group polymerase chain reaction (PCR) result was positive, and the patient was provisionally given a diagnosis of dengue fever. A dengue-specific PCR result was negative. However, sequencing of the original flavivirus PCR product identified it as Zika virus (GenBank accession no. KF258813). The patient's symptoms had completely resolved after two weeks from onset of symptoms, and a convalescent PCR result at this time was negative for flavivirus.\n"+
      "Zika virus is an RNA-containing flavivirus first isolated in 1948 from a sentinel rhesus monkey in the Zika Forest of Uganda. A number of cases of infection with this virus have since been reported in Africa, India, Southeast Asia, and Micronesia. Recent phylogenetic analysis of reported Zika virus strains has suggested that strains from Africa and Asia have emerged as two distinct virus lineages (Figure 1). \n"+
      "Infection with Zika virus results in a clinical syndrome similar to illness resulting from infection with other flaviviruses. Commonly reported symptoms include malaise, headache, maculopapular rash, myalgia, arthralgia, conjunctivitis, and fever. Diagnosis can be confirmed by demonstration of specific antibodies against Zika virus in serum or by PCR detection of the virus. Detailed serologic testing of the Yap Islands Zika virus outbreak in 2007 showed limited cross-reactivity with IgM against other flaviviruses, including dengue virus.\n"+
      "To our knowledge, this is the first case of Zika virus infection reported in a returned traveler to Australia, although serologic evidence of Zika virus infection has been reported in Java, Indonesia. The only other reported cases outside virus-endemic regions were in two U.S. scientists working in Senegal who showed development of clinical infection after returning to the United States, and one scientist subsequently infected his wife, possibly through sexual transmission. However, it is likely that many cases are either undiagnosed (because of mild symptoms) or misdiagnosed, presumably most commonly as dengue fever, given their clinical similarities. Cross-sectional surveys in Africa and Asia show higher seroprevalence of antibodies against Zika virus than is suggested on the basis of the reported incidence of Zika infection.\n"+
      "For returned travelers, accurate diagnosis and rapid differentiation from other possible travel-related illnesses is important in minimizing healthcare-associated morbidity. In our patient, although a provisional diagnosis of dengue fever was made, the absence of thrombocytopenia and the negative results for nonstructural protein 1 in the context of a positive PCR result for flavivirus was believed to be unusual. To our knowledge, thrombocytopenia has not been reported with confirmed Zika virus infection.\n"+
      "Although severe cases of Zika virus infection in humans have not been described, the spectrum of clinical disease remains uncertain. As with other flaviviruses, a seemingly indolent virus may in some cases be associated with more significant illness. With more frequent identification of cases through pan-flavirvirus molecular testing, better characterization of the evolving epidemiology and full clinical spectrum of Zika virus infection will be possible. \n"+
      "Authors' addresses: Jason C. Kwong and Karin Leder, Victorian Infectious Diseases Service, The Royal Melbourne Hospital, Parkville, Victoria, Australia, E-mails: moc.liamg@jgnowk and ude.hsanom@redel.nirak. Julian D. Druce, Victorian Infectious Diseases Reference Laboratory, North Melbourne Victoria, Australia, E-mail: ua.gro.hm@ecurd.nailuj.\n"+
      "";
    }
  }

  function setup() {
  }

  $(window).scroll(function() {
    var windowPosition = $(window).scrollTop();
    var panelHeight = $('#detail-panel').height();
    var tableHeight = $('table').height();
    if(windowPosition < tableHeight - panelHeight){
      $("#mapsec").stop().animate({"marginTop": (windowPosition) + "px"}, "fast", "swing");
    }
  });

  function pad ( val ) { return val > 9 ? val : "0" + val; }
  setInterval( function(){
      $("#seconds").html(++$scope.processingTime + " s");
  }, 1000);

  $scope.extract = function() {
    $scope.processingTime = 0;
    $scope.showDetail = false;
    var inpText = ($scope.inpText === undefined)?'':String($scope.inpText).trim();
    // clear results
    $scope.results = null;
    $('#extract-results').addClass('hidden');
    $('#extract-errors').addClass('hidden');
    $scope.extractMsg = null;
    $scope.clearLayerFeatures();
    // extract based on input type
    if (inpText.match(GENBANKIDS_REGEX)) {
        $scope.inpType = 1;
    } else if (inpText.match(PUBMEDIDS_REGEX)) {
      $scope.inpType = 2;
    } else {
      $scope.inpType = 3;
    } 
    $scope.processing = true;
    if($scope.inpType == 1){
      $scope.extractGenbank(inpText);    
    } else if($scope.inpType == 2) {
      $scope.extractPubmed(inpText);
    } else {
      $scope.extractText(inpText);
    }
  }

  $scope.extractGenbank = function(inpText) {
    if(inpText.trim() != ""){
      var ids = inpText.trim().split(/[\s,]/).filter(Boolean).join(",");
      var uriparams = 'text=' + ids + '&suff=' + $scope.selSuffLevel + '&maxlocs=' + $scope.selMaxPossLocations;
      //uriparams = encodeURIComponent(uriparams);
      var uri = getServer()+'/accession?'+uriparams;
      // console.log('Public:'+uri);
      $scope.lookupResults = [];
      $http.get(uri).then(function(response) {
        if (response.status === 200) {
          $scope.loadResults(response);
        } else {
          $scope.errorMsg = "Failed!! Check query and try again.";
        }
        $scope.processing = false;
      })
      .catch(function (response) {
        // console.log("GenBank response: ", response.status);
        $scope.processing = false;
        if (response.status === 500) {
          $scope.errorMsg = "Kindly try again. If the problem persists, please contact amagge@asu.edu.";
          $('#extract-errors').removeClass('hidden');
        }
      });
    }
  }

  $scope.extractPubmed = function(inpText) {
    if(inpText.trim() != ""){
      var ids = inpText.trim().split(/[\s,]/).filter(Boolean).join(",");
      var uriparams = 'text=' + ids;
      //uriparams = encodeURIComponent(uriparams);
      var uri = getServer()+'/pubmed?'+uriparams;
      // console.log('Public:'+uri);
      $scope.lookupResults = [];
      $http.get(uri).then(function(response) {
        if (response.status === 200) {
          $scope.loadResults(response);
        } else {
          console.log('Public:' + response.data.error);
          $scope.searchMsg = "Failed!! Check query and try again.";
        }
        $scope.processing = false;
      })
      .catch(function (response) {
        $scope.processing = false;
        if (response.status === 500) {
          $scope.errorMsg = "Kindly try again. If the problem persists, please contact amagge@asu.edu.";
          $('#extract-errors').removeClass('hidden');
        }
      });
    }
  }

  $scope.extractText = function(inpText) {
    inpText = inpText.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
    var postdata = {"text" : inpText.trim()};
    var uri = getServer()+'/resolve';
    // console.log('Public: '+uri);
    $scope.extractResults = [];
    $http.post(uri, postdata).then(function(response) {
      if (response.status === 200) {
        $scope.loadResults(response);
      } else {
        console.log('Public: ' + response.data.error);
        $scope.searchMsg = "Failed!! Check query and try again.";
      }
      $scope.processing = false;
    })
    .catch(function (response) {
      $scope.processing = false;
      if (response.status === 500) {
        $scope.errorMsg = "Kindly try again. If the problem persists, please contact amagge@asu.edu.";
        $('#extract-errors').removeClass('hidden');
      }
    });
  }

  $scope.loadResults = function(response) {
    // $scope.printObject(response.data.records);
    console.log("Loading "+ response.data.records.length + " records.")
    var results = response.data.records;
    var new_results = []
    if($scope.inpType == 1){
      // Type GenBank
      searchMessage = response.data.records.length +" GenBank accessions retrieved. <i>Click on row for details.</i>";
      summary = "";
      for (var i=0;i<results.length; i++){
        result = results[i];
        result.metadatalocs = $scope.getEmbMetadataLocs(result);
        result.pmids = $scope.getEmbPubmedIds(result);
        pmobjs = result.pmobjs;
        pubmed_summaries = []
        for (var j=0;j<pmobjs.length; j++){
          pmobj = pmobjs[j];
          pmlocs = pmobj.pmlocs;
          summary = $scope.getEmbText(pmlocs, pmobj.raw_text).summary;
          if (pmobj.open_access) {
            title = "<button type=\"button\" class=\"collapsible\">"+"<b>PubMed ID: "+"<a href=\"https://www.ncbi.nlm.nih.gov/pmc/articles/pmid/"+pmobj.pmid+"\" target=\"_blank\">"+pmobj.pmid+"</a>";
          } else {
            title = "<button type=\"button\" class=\"collapsible\">"+"<b>PubMed ID: "+"<a href=\"https://www.ncbi.nlm.nih.gov/pubmed/"+pmobj.pmid+"\" target=\"_blank\">"+pmobj.pmid+"</a>";
          }
          title += "</b> ("+ (pmobj.open_access ? "OA Article" : "Abstract") + " Summary)</button>";
          summary = summary == "" ? "<div class=\"content\"><span style=\"color:red\"><i>" + "NO LOCATIONS FOUND" + "</i></span></div>" : "<div class=\"content\">"+summary+"</div>";
          pubmed_summaries.push({"pmid":pmobj.pmid, "summary":title+summary});
        }
        result.pubmed_summaries = pubmed_summaries;
        new_results.push(result);
      }
    } else if($scope.inpType == 2){
      // Type PubMed
      searchMessage = response.data.records.length +" PubMed/PMC records retrieved. <i>Click on row for details.</i>";
      summary = "";
      for (var i=0;i<results.length; i++){
        result = results[i];
        // $scope.printObject(result);
        result.poss_locs = result.pmlocs;
        pubmed_summaries = []
        if(result.pmlocs.length > 0){
          text = $scope.getEmbLocs(result.pmlocs);
          result.pubmedlocs = text;
        }
        summary = $scope.getEmbText(result.pmlocs, result.raw_text).full_text;
        if (result.open_access)
          title = "<h5><b>"+"PubMed ID: "+"<a href=\"https://www.ncbi.nlm.nih.gov/pmc/articles/pmid/"+result.pmid+"\" target=\"_blank\">"+result.pmid+"</a>";
        else
          title = "<h5><b>"+"PubMed ID: "+"<a href=\"https://www.ncbi.nlm.nih.gov/pubmed/"+result.pmid+"\" target=\"_blank\">"+result.pmid+"</a>";
        title += "</b> ("+ (result.open_access ? "Article" : "Abstract") + " Summary)</h5></br>";
        summary = summary == "" ? "<span style=\"color:red\"><i>" + "NO LOCATIONS FOUND" + "</i></span>" : summary;
        pubmed_summaries.push({"pmid":result.pmid, "summary":title+summary});
        result.pubmed_summaries = pubmed_summaries;
        new_results.push(result);
      }
    } else if($scope.inpType == 3){
      searchMessage = response.data.records.length +" geographic locations found. <i>Click on row for details.</i>";      text = response.data.text;
      // Type Text
      for (var i=0;i<results.length; i++){
        result = results[i];
        context = text.substring(result.span.sent_start, result.span.sent_end);
        context = "<p>" +text.substring(result.span.sent_start, result.span.start) + 
                  "<span style=\"color:blue\" data-tooltip-position=\"top\" data-tooltip=\"Type : Geographic Location\">" + text.substring(result.span.start, result.span.end) + "</span>" +
                  text.substring(result.span.end, result.span.sent_end) + "</p>";
        result.text = result.span.text;
        result.context = context;
        new_results.push(result);
      }
    }
    $scope.results = new_results;
    $('#extract-results').removeClass('hidden');
    $scope.extractMsg = searchMessage;
    if($scope.geoLocMap == null){
      initMap();
    }
    // activateCollapsibles();
  }

  $scope.getEmbPubmedIds = function(result) {
    text = "";
    if (result.pmid){
      text += "<a href=\"https://www.ncbi.nlm.nih.gov/pubmed/"+result.pmid+"\" target=\"_blank\">"+result.pmid+"</a>";
    }
    join = false;
    if (result.pmobjs.length > 0){
      text += " (";
      for (var i=0;i<result.pmobjs.length; i++){
        if (result.pmobjs[i].pmid == result.pmid) 
          continue 
        if (join == true) {
          text += ", ";
        } else {
          join = true;
        }
        if (result.pmobjs[i].open_access == true) {
          text += "<a href=\"https://www.ncbi.nlm.nih.gov/pmc/articles/pmid/"+result.pmobjs[i].pmid+"\" target=\"_blank\">"+result.pmobjs[i].pmid+"</a>";
        } else {
          text += "<a href=\"https://www.ncbi.nlm.nih.gov/pubmed/"+result.pmobjs[i].pmid+"\" target=\"_blank\">"+result.pmobjs[i].pmid+"</a>";
        }
      }
      text += ")";
    } else {
      if (result.linked_pmids.length > 0) {
        text += " (";
        for (var i=0;i<result.linked_pmids.length; i++){
          if (result.linked_pmids[i] == result.pmid) 
            continue 
          if (join == true) {
            text += ", ";
          } else {
            join = true;
          }
          text += "<a href=\"https://www.ncbi.nlm.nih.gov/pubmed/"+result.linked_pmids[i]+"\" target=\"_blank\">"+result.linked_pmids[i]+"</a>";
        }
        text += ")";
      }
    }
    return text;
  }

  $scope.getEmbMetadataLocs = function(result) {
    text = "";
    var strainDict = '';
    var metaDict = '';
    var countryDict = '';
    var latlonDict = '';
    for (var property in result.source) {
      if (property=="organism" || property=="isolate" || property=="strain")
        strainDict += property + ': ' + result.source[property]+'\n';
      else if (property=="country")
        countryDict += property + ': ' + result.source[property]+'\n';
      else if (property=="lat_lon")
        latlonDict += property + ': ' + result.source[property]+'\n';
      metaDict += property + ': ' + result.source[property]+'\n';
    }
    if (result.source.country){
      if (!isEmptyObject(result.country_loc)){
        var location = $scope.getFormattedLoc(result.country_loc);
        text += "<span title=\""+countryDict+"\"><a style=\"color:red\" href=\"https://www.geonames.org/"+result.country_loc.GeonameId+"/earth.html\" target=\"_blank\">"+location+"</a></span>";
      }
    }
    if (result.source.lat_lon){
      if (!isEmptyObject(result.latlon_loc)){
        var location = $scope.getFormattedLoc(result.latlon_loc);
        if (text.length > 0) {
          text += "<br>";
        }
        text += "<span title=\""+latlonDict+"\"><a style=\"color:darkred\" href=\"https://www.geonames.org/"+result.latlon_loc.GeonameId+"/earth.html\" target=\"_blank\">"+location+"</a></span>";
      }
    }
    if (result.source.strain){
      if (!isEmptyObject(result.strain_loc)){
        var location = $scope.getFormattedLoc(result.strain_loc);
        if (text.length > 0) {
          text += "<br>";
        }
        text += "<span title=\""+strainDict+"\"><a style=\"color:blue\" href=\"https://www.geonames.org/"+result.strain_loc.GeonameId+"/earth.html\" target=\"_blank\">"+location+"</a></span>";
      }
    }
    if (text.length > 0) {
      text += "<br>";
    }
    text += "<span title=\""+metaDict+"\"><a style=\"color:grey\"><i>source metadata</i></a></span>" ;
    return text;
  }

  $scope.getEmbLocs = function(locs) {
    text = "";
    for (var i=0;i<locs.length; i++){
      loc = locs[i];
      if (loc.best_loc) {
        text += "<span title=\"Go to Geonames\"><a style=\"color:red\" href=\"https://www.geonames.org/"+loc.best_loc.GeonameId+"/earth.html\" target=\"_blank\">"+loc.span.text+"</a></span>, ";
      } else {
        text += loc.span.text+", ";
      }
    }
    if (locs.length > 0) {
      text = text.substring(0, text.length-2);
    }
    return text;
  }

  $scope.getFormattedLoc = function(loc) {
    var location = "";
    if (loc.Code.startsWith("PCL")){
      location = loc.Country;
    } else {
      if (loc.Code.startsWith("ADM1")){
        location = loc.State + ", " + loc.Country;
      } else {
        if (loc.Code.startsWith("ADM2")){
          location = loc.County + ", " + loc.State + ", " + loc.Country;
        } else {
          location = loc.Name + (loc.AncestorsNames? (", "+loc.AncestorsNames):"");
        }
      }
    }
    location = location.replace(/ *\([^)]*\) */g, "");
    return location;
  }

  $scope.getEmbText = function(ents, text) {
    ents.sort(compare);
    full_emb_text = text;
    prev_index = -1;
    prev_sent = "";
    summary = []
    for (j=0;j<ents.length; j++){
      ent = ents[j].span;
      type = "Geographic Location";
      prob = ents[j].probability;
      // Embed full text
      full_emb_text = full_emb_text.substring(0, ent.start) + 
      "<span style=\"color:blue\" title=\"Type: " + type + ", Entity Probability:" + prob + "\">" + full_emb_text.substring(ent.start, ent.end) + "</span>" +
      full_emb_text.substring(ent.end);
      // Now embed sentences for summary
      if (ent.sent_start == prev_index){
        sent = prev_sent;
      } else {
        if(prev_sent != "") {
          summary.unshift(prev_sent);
          prev_sent = ""
        }
        sent = text.substring(ent.sent_start, ent.sent_end);
      }
      sent = sent.substring(0, ent.start-ent.sent_start) + 
              "<span style=\"color:blue\" title=\"Type: " + type + ", Entity Probability:" + prob + "\">" + sent.substring(ent.start-ent.sent_start, ent.end-ent.sent_start) + "</span>" +
              sent.substring(ent.end-ent.sent_start);
      prev_sent = sent;  
      prev_index = ent.sent_start;
    }
    // If previous sentence is empty push it
    if(prev_sent != "") {
      summary.unshift(prev_sent);
    }
    // Now join it
    summary_text = "";
    for (j=0;j<summary.length; j++){
      summary_text += summary[j] + "</br>";
    }
    return {full_text: full_emb_text, summary: summary_text};
  }
  
  $scope.exportResults = function(mode, header) {
    // Columns in relation file are
    // Accession, PMC_IDs, Sufficient, Record, Unprocessed_PMCIDS, Text, Table, Final_Location, Lat/Lng, GeonameID
    // Columns in summary file are
    // Accession, GeonameID, Location_text, Confidence, Lat, Long, Feature_CODE, Country_Code, Geoname_Norm_Confidence
    console.log("Exporting " + $scope.results.length + " records")
    exportedRows = []
    if ($scope.inpType == 1){
      if(header==true){
        // write header
        row = {
          "Accession":"Accession",
          "Sufficient":"Sufficient",
          "PubMedIDs":"PubMedIDs",
          "GeonameId":"GeonameId",
          "Location":"Location",
          "Code":"Code",
          "Class":"Class",
          "Latitude":"Latitude",
          "Longitude": "Longitude",
          "Probability": "Probability"
        }
        exportedRows.push(row);
      }
      for (i=0;i<$scope.results.length; i++){
        result = $scope.results[i];
        var pmids = "";
        for (var k=0;k<result.pmobjs.length; k++){ 
          pmids += (k>0)?", ":"";
          pmids += result.pmobjs[k].pmid+" ("+(result.pmobjs[k].open_access?"OA":"Abstract")+")";
        }
        if (result.poss_locs.length > 0) {
          for (j=0;j<result.poss_locs.length; j++){
            pmloc = result.poss_locs[j]
            row = {
              "Accession": result.accid,
              "Sufficient": pmloc.Sufficient,
              "PubMedIDs": pmids,
              "GeonameId": pmloc.GeonameId,
              "Location": $scope.formatName(pmloc),
              "Code": pmloc.Code,
              "Class": pmloc.Class,
              "Latitude": pmloc.Latitude,
              "Longitude": pmloc.Longitude,
              "Probability": pmloc.Probability
            }
            exportedRows.push(row);
          }
        } else {
          console.log("No result for record: " + result.accid)
        }
      }
    } else if ($scope.inpType == 2) {
    } else {
    }

    return exportedRows;
  }

  $scope.exportJson = function() {
    let dataStr = JSON.stringify($scope.results, null, 2);
    let dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    let exportFileDefaultName = 'zodo_data.json';
    let linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  $scope.formatName = function(pmloc){
    name = pmloc.Name + ", " + pmloc.AncestorsNames;
    name = name.replace(/ *\([^)]*\) */g, "");
    return name;
  }

  // reverse sort
  function compare(a,b) {
    return b.span.start - a.span.start;
  }

  $scope.LoadDetails = function(selrecord) {
    $scope.selectedRecord = selrecord;
    // $scope.printObject(selrecord);
    $scope.highlightLocation(selrecord);
    $scope.showDetailPanel();
    if ($scope.inpType==1 && selrecord && selrecord.pmobjs.length > 0) {
      $scope.showDetail = true;
    } else if ($scope.inpType==2 && selrecord){
      $scope.showDetail = true;
    } else {
      $scope.showDetail = false;
    }
    setTimeout(function() {
      activateCollapsibles();
    }, 200);
  };

  // Click handlers
  $scope.highlightLocation = function(record) {
    // console.log("Highlighting");
    // $scope.printObject(record);
    $scope.clearLayerFeatures();
    animate = true;
    show_best = false;
    if($scope.inpType == 1){
      // GB-Records
      // Update all locations
      // In case of GenBank, get the best locations and show them
      if (record.poss_locs && record.poss_locs.length > 0){
        if (record.poss_locs[0].Sufficient){
          show_best = true;
          $scope.setPossibleLocations(record.poss_locs, show_best, animate);
          animate = false;
        }
      }
      // Load GenBank location if available
      if (Object.keys(record.country_loc).length){
        $scope.setCountryLocation(record.country_loc, animate);
        animate = false;
      }    
      if (Object.keys(record.strain_loc).length){
        $scope.setStrainLocation(record.strain_loc, animate);
        animate = false;
      }    
    } else if($scope.inpType == 2){
      // Pubmed-Records
      poss_locs = []
      for(var i=0; i<record.pmlocs.length;i++){
        var posLoc = record.pmlocs[i].best_loc;
        if (posLoc) {
          poss_locs.push(posLoc);
        }
      }
      $scope.setPossibleLocations(poss_locs, show_best, animate);
    } else {
      // Text
      var possLocs = record.poss_locs;
      $scope.setPossibleLocations(possLocs, show_best, animate);
    }
  };

  $scope.setCountryLocation = function(record, animate) {
    // $scope.printObject(record);
    var features = [];
    var center = [0,0];
    var coord = ol.proj.transform([parseFloat(record.Longitude), parseFloat(record.Latitude)], 'EPSG:4326', 'EPSG:3857');
    var pointonmap = new ol.Feature(new ol.geom.Point(coord));
    pointonmap.set('Name',record.Name);
    pointonmap.set('GeonameId',record.GeonameId);
    pointonmap.set('Code',record.Code);
    pointonmap.set('AncestorsNames',record.AncestorsNames);
    pointonmap.set('Country',record.Country);
    // pointonmap.set('Probability',record.Probability);
    features.push(pointonmap);
    center = coord;
    // $('#probThreshold').hide();
    // $('#probThrVal').hide();
    var mapLayers = $scope.geoLocMap.getLayers().getArray();
    mapLayers.forEach(function (layer, i) {
      if (layer.get('zodolayer')=='country'){
        layer.getSource().clear();
        layer.getSource().addFeatures(features);
        // $scope.geoLocMap.getView().setCenter(center);
        if (animate){
          $scope.geoLocMap.getView().animate({
            center: center,
            duration: 500
          });
        }
        // $scope.geoLocMap.getView().setZoom(3);
      }
    });
  }

  $scope.setStrainLocation = function(record, animate) {
    // $scope.printObject(record);
    var features = [];
    var center = [0,0];
    var coord = ol.proj.transform([parseFloat(record.Longitude), parseFloat(record.Latitude)], 'EPSG:4326', 'EPSG:3857');
    var pointonmap = new ol.Feature(new ol.geom.Point(coord));
    pointonmap.set('Name',record.Name);
    pointonmap.set('GeonameId',record.GeonameId);
    pointonmap.set('Code',record.Code);
    pointonmap.set('AncestorsNames',record.AncestorsNames);
    pointonmap.set('Country',record.Country);
    // pointonmap.set('Probability',record.Probability);
    features.push(pointonmap);
    center = coord;
    // $('#probThreshold').hide();
    // $('#probThrVal').hide();
    var mapLayers = $scope.geoLocMap.getLayers().getArray();
    mapLayers.forEach(function (layer, i) {
      if (layer.get('zodolayer')=='strain'){
        layer.getSource().clear();
        layer.getSource().addFeatures(features);
        // $scope.geoLocMap.getView().setCenter(center);
        if (animate){
          $scope.geoLocMap.getView().animate({
            center: center,
            duration: 500
          });
        }
        // $scope.geoLocMap.getView().setZoom(3);
      }
    });
  }

  $scope.setPossibleLocations = function(poss_locs, show_best, animate) {
    var maxProb = 0;
    var bestLoc = [];
    var features = [];
    var center = [0,0];
    // $scope.printObject(poss_locs, show_best, animate);
    for(var i=0; i < poss_locs.length; i++){
      var posLoc = poss_locs[i];
      // if below threshold don't display point
      if (parseFloat(posLoc.Probability) < $scope.threshold)
        continue;
      var coord = ol.proj.transform([parseFloat(posLoc.Longitude), parseFloat(posLoc.Latitude)], 'EPSG:4326', 'EPSG:3857');
      var pointonmap = new ol.Feature(new ol.geom.Point(coord));
      pointonmap.set('Name',posLoc.Name);
      pointonmap.set('GeonameId',posLoc.GeonameId);
      pointonmap.set('Code',posLoc.Code);
      pointonmap.set('AncestorsNames',posLoc.AncestorsNames);
      pointonmap.set('Country',posLoc.Country);
      pointonmap.set('Probability',posLoc.Probability);
      features.push(pointonmap);
      if (i==0){
        center = coord;
      }
      if (posLoc.Probability && posLoc.Probability>maxProb){
        bestLoc.push(pointonmap);
        center = coord;
        maxProb = posLoc.Probability;
      }
    }
    var mapLayers = $scope.geoLocMap.getLayers().getArray();
    mapLayers.forEach(function (layer, i) {
      if (layer.get('zodolayer')=='possible'){
        layer.getSource().clear();
        layer.getSource().addFeatures(features);
        // $scope.geoLocMap.getView().setCenter(center);
        if (animate){
          $scope.geoLocMap.getView().animate({
            center: center,
            duration: 500
          });
        }
        // $scope.geoLocMap.getView().setZoom(3);
      } else if (layer.get('zodolayer')=='best'){
        layer.getSource().clear();
        if (show_best){
          layer.getSource().addFeatures(bestLoc);
        }
      }
    });
  }

  function activateCollapsibles() {
    var coll = document.getElementsByClassName("collapsible");
    var i;
    for (i = 0; i < coll.length; i++) {
      coll[i].addEventListener("click", function() {
        this.classList.toggle("active");
        var content = this.nextElementSibling;
        if (content.style.display === "block") {
          content.style.display = "none";
        } else {
          content.style.display = "block";
        }
      });
    }
  }

  // Map Stuff
  function initMap() {
    var raster = new ol.layer.Tile({
      source: new ol.source.XYZ({
      attributions: 'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/' +
                    'rest/services/World_Topo_Map/MapServer">ArcGIS</a>',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
      })
    });
    raster.set('zodolayer','tile');

    // possible locations layer
    var featureStyle = new ol.style.Style({
      text: new ol.style.Text({
        text: '\uf041',
        font: 'normal 20px FontAwesome',
        textBaseline: 'Bottom',
        fill: new ol.style.Fill({
          color: 'black'
        })
      })
    });
    var vectorSource = new ol.source.Vector({features: []});
    var possLocsLayer = new ol.layer.Vector({
      source: vectorSource,
      style: [featureStyle]
    })
    possLocsLayer.set('zodolayer','possible');

    // country field layer
    var featureStyle = new ol.style.Style({
      text: new ol.style.Text({
        text: '\uf041',
        font: 'normal 22px FontAwesome',
        textBaseline: 'Bottom',
        fill: new ol.style.Fill({
          color: 'red'
        })
      })
    });
    var vectorSource = new ol.source.Vector({features: []});
    var countryLayer = new ol.layer.Vector({
      source: vectorSource,
      style: [featureStyle]
    })
    countryLayer.set('zodolayer','country');

    // strain field layer
    var featureStyle = new ol.style.Style({
      text: new ol.style.Text({
        text: '\uf041',
        font: 'normal 24px FontAwesome',
        textBaseline: 'Bottom',
        fill: new ol.style.Fill({
          color: 'blue'
        })
      })
    });
    var vectorSource = new ol.source.Vector({features: []});
    var strainLayer = new ol.layer.Vector({
      source: vectorSource,
      style: [featureStyle]
    })
    strainLayer.set('zodolayer','strain');

    // best known location layer
    var featureStyle = new ol.style.Style({
      text: new ol.style.Text({
        text: '\uf041',
        font: 'normal 26px FontAwesome',
        textBaseline: 'Bottom',
        fill: new ol.style.Fill({
          color: 'green'
        })
      })
    });
    var vectorSource = new ol.source.Vector({features: []});
    var bestLayer = new ol.layer.Vector({
      source: vectorSource,
      style: [featureStyle]
    })
    bestLayer.set('zodolayer','best');

    // Put all layers together in the map
    $scope.geoLocMap = new ol.Map({
      layers: [raster, possLocsLayer, countryLayer, strainLayer, bestLayer],
      target: 'geolocmap',
      view: new ol.View({
        extent: ol.proj.get("EPSG:3857").getExtent(),
        center: [0, 0],
        zoom: 3
      })
    });

    var info = $('#info');
    setTooltip(info);

    $('#probThreshold').on('input', function() {
      $('#probThrVal').text($('#probThreshold').val()+"%");
      $scope.updateThreshold($('#probThreshold').val()/100);
    });
  };

  $scope.clearLayerFeatures = function() {
    if($scope.geoLocMap){
      var mapLayers = $scope.geoLocMap.getLayers().getArray();
      mapLayers.forEach(function (layer, i) {
        if (layer.get('zodolayer')!='tile'){
          if(layer.getSource()){
            layer.getSource().clear();
          }
        }
      });
    }
  }

  function setTooltip(info) {
    info.tooltip({animation: false, trigger: 'manual'});
    var displayFeatureInfo = function(pixel) {
      var feature = $scope.geoLocMap.forEachFeatureAtPixel(pixel, function(feature) {
        return feature;
      });
      if (feature && feature.get('GeonameId')) {
        var leftpos = $scope.geoLocMap.getTargetElement().getBoundingClientRect().left;
        var toppos = $scope.geoLocMap.getTargetElement().getBoundingClientRect().top;
        // This part needs fiddling around each time the map size changes
        info.css({
          left: (pixel[0]) + 'px',
          // top: (toppos + pixel[1] - 320) + 'px'
          top: (pixel[1]) + 'px'
        });
        var code = feature.get('Code');
        var name = feature.get('Name');
        if (!code.startsWith("PCL")){
          if (feature.get('AncestorsNames')){
            name += ", " + feature.get('AncestorsNames');
          }
        }
        name = name.replace(/ *\([^)]*\) */g, "");
        var displayText = 'Name: ' + name +
                          '\n Code: ' + code +
                          '\n GeonameId: ' + feature.get('GeonameId');
        if(feature.get('Probability')){
          displayText += '\n Probability: ' + (parseFloat(feature.get('Probability'))*100).toFixed(2) + '%';
        }
        info.tooltip('hide')
            .attr('data-original-title', displayText)
            .tooltip('fixTitle')
            .tooltip('show');
      } else {
        info.tooltip('hide');
      }
    };
    $scope.geoLocMap.on('pointermove', function(evt) {
      if (evt.dragging) {
        info.tooltip('hide');
        return;
      }
      displayFeatureInfo($scope.geoLocMap.getEventPixel(evt.originalEvent));
    });
    $scope.geoLocMap.on('click', function(evt) {
      displayFeatureInfo(evt.pixel);
    });
  }

  $scope.updateSelections = function(record, add) {
    var mapLayers = $scope.geoLocMap.getLayers().getArray();
    mapLayers.forEach(function (layer, i) {
      if (layer.get('zodolayer')=='selection'){
        if(add){
          var coord = ol.proj.transform([parseFloat(record.Longitude), parseFloat(record.Latitude)], 'EPSG:4326', 'EPSG:3857');
          var pointonmap = new ol.Feature(new ol.geom.Point(coord));
          pointonmap.setId(record.loc.GeonameId);
          pointonmap.set('name',record.loc.Name);
          pointonmap.set('geonameid',record.GeonameId);
          pointonmap.set('country',record.Country);
          layer.getSource().addFeature(pointonmap);
          $scope.geoLocMap.getView().setCenter(coord);
        } else {
          layer.getSource().removeFeature(layer.getSource().getFeatureById(record.accession)); 
        }
      }
    });
  };

  $scope.updateAllSelections = function(records, add) {
    var mapLayers = $scope.geoLocMap.getLayers().getArray();
    mapLayers.forEach(function (layer, i) {
      if (layer.get('zodolayer')==='selection'){
        if(add){
          var features = [];
          for(var j=0; j<records.length; j++){
            var record = records[j].location;
            if(record.Latitude!='Unknown' && record.Longitude!='Unknown'){
              var longitude = parseFloat(record.Longitude);
              var latitude = parseFloat(record.Latitude);
              if(isNaN(longitude)||isNaN(longitude)||longitude<-180||longitude>180||latitude<-90||latitude>90)
                console.log('Ignoring ' + record.GeonameId + ' = ' + record.Longitude + ' : ' + record.Latitude);
              var coord = ol.proj.transform([parseFloat(record.Longitude), parseFloat(record.Latitude)], 'EPSG:4326', 'EPSG:3857');
              var pointonmap = new ol.Feature(new ol.geom.Point(coord));
              pointonmap.setId(record.loc.GeonameId);
              pointonmap.set('name',record.loc.Name);
              pointonmap.set('geonameid',record.GeonameId);
              pointonmap.set('country',record.Country);
              features.push(pointonmap);
            } else {
              // console.log("No coordinates found for " + record.accession);
            }
          }
          // var vectorSource = new ol.source.Vector({features: features});
          // layer.setSource(vectorSource); 
          layer.getSource().clear(); 
          layer.getSource().addFeatures(features);
        } else {
          layer.getSource().clear(); 
        }
      }
    });
  };  
  
  $scope.printObject = function(object) {
    var output = '';
    for (var property in object) {
      output += property + ': ' + object[property]+'; ';
    }
    console.log(output);
  };
  
  function isEmptyObject(obj) {
    for (var name in obj) {
        if (obj.hasOwnProperty(name)) {
            return false;
        }
    }
    return true;
}
});